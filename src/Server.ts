import bodyParser = require("body-parser");
import config from "config";
import express = require("express");
import request = require("request");
import { inspect } from "util";
import { IModule } from "./modules/IModule";
import { KeywordModule } from "./modules/KeywordModule";
import { CallbackRoute } from "./routes/CallbackRoute";
import { Logger } from "./utils/logger";

export class Server {
    private logger: Logger;

    private groupMeBaseUrl: string = "https://api.groupme.com/v3";
    private groupMeBotSendMessageUrl: string = this.groupMeBaseUrl + "/bots/post";
    private accessToken: string;

    private app: express.Application;
    private port: number;

    private conversationGroups: Map<string, {group_id: string, bot_id: string}>;
    private managementGroups: Map<string, {group_id: string, bot_id: string}>;
    private modules: IModule[];
    private messageHandlers: IModule[];
    private commandHandlers: IModule[];

    constructor() {
        this.logger = new Logger("Server");

        if (!config.has("access_token")) {
            this.logger.warn("Access token not specified");
            this.accessToken = "";
        } else {
            this.accessToken = config.get("access_token");
        }

        this.port = this.getPort();
        this.conversationGroups = this.getConversationGroups();
        this.logger.info("Listening to messages from groups %s", Array.from(this.conversationGroups.keys()));
        this.managementGroups = this.getManagementGroups();
        this.logger.info("Listening to management commands from groups %s", Array.from(this.managementGroups.keys()));

        this.modules = [];
        this.messageHandlers = [];
        this.commandHandlers = [];

        this.app = express();
        this.config();
        this.routes();
    }

    public processCallback(callbackBody: {group_id: string, text: string, sender_type: string}) {
        if (callbackBody.sender_type !== "user") {
            this.logger.info("Message not from user, skipping");
            return;
        }

        if (callbackBody.text === "/help") {
            this.processHelpCommand(callbackBody);
        }

        if (callbackBody.text.charAt(0) === "/" && this.managementGroups.has(callbackBody.group_id)) {
            this.processManagementCommand(callbackBody);
        } else if (this.conversationGroups.has(callbackBody.group_id)) {
            this.processMessage(callbackBody);
        } else {
            this.logger.warn("Got callback for unregistered group %j", callbackBody);
        }
    }

    public start() {
        this.app.listen(this.port, () => {
            this.logger.info("Server listening on port %d", this.port);
        });
    }

    public subscribeToMessages(module: IModule): void {
        this.messageHandlers.push(module);
    }

    public subscribeToManagementCommands(module: IModule): void {
        this.commandHandlers.push(module);
    }

    public sendMessage(groupId: string, message: string) {
        let botId = "";
        let entry = this.managementGroups.get(groupId);
        if (entry !== undefined) {
            botId = entry.bot_id;
        } else {
            entry = this.conversationGroups.get(groupId);
            if (entry !== undefined) {
                botId = entry.bot_id;
            }
        }
        if (botId === "") {
            this.logger.warn("Corresponding bot id for group id %d not found", groupId);
        }

        this.logger.info("Sending message. Bot id: %s Text: %s", botId, message);
        request.post(this.groupMeBotSendMessageUrl, {
            qs: {
                bot_id: botId,
                text: message,
                token: this.accessToken,
            },
        }, (error, res) => {
            if (error) {
                this.logger.error(error);
            } else if (res.statusCode >= 200 && res.statusCode < 300) {
                this.logger.info("Message sent successfully");
            }
        });
    }

    private getPort(): number {
        if (process.env.PORT !== undefined) {
            const port: number = parseInt(process.env.PORT, 10);
            if (!isNaN(port)) {
                return port;
            }
        }

        if (config.has("port")) {
            return config.get<number>("port");
        }

        return 8080;
    }

    private getConversationGroups(): Map<string, {group_id: string, bot_id: string}> {
        const map = new Map<string, {group_id: string, bot_id: string}>();
        if (config.has("conversation_groups")) {
            const groups = config.get<Array<{group_id: string, bot_id: string}>>("conversation_groups");
            for (const group of groups) {
                map.set(group.group_id, group);
            }
        }

        return map;
    }

    private getManagementGroups(): Map<string, {group_id: string, bot_id: string}> {
        const map = new Map<string, {group_id: string, bot_id: string}>();
        if (config.has("management_groups")) {
            const groups = config.get<Array<{group_id: string, bot_id: string}>>("management_groups");
            for (const group of groups) {
                map.set(group.group_id, group);
            }
        }

        return map;
    }

    private config() {
        this.app.use(bodyParser.json());

        this.modules.push(new KeywordModule(this));
    }

    private routes() {
        const router: express.Router = express.Router();

        const cbRoute: CallbackRoute = new CallbackRoute(this);
        cbRoute.create(router);

        this.app.use(router);
    }

    private processManagementCommand(callbackBody: {group_id: string, text: string}) {
        for (const handler of this.commandHandlers) {
            const handled = handler.processCommand(callbackBody);
            if (handled) {
                break;
            }
        }
    }

    private processMessage(callbackBody: {group_id: string, text: string}) {
        for (const handler of this.messageHandlers) {
            const handled = handler.processMessage(callbackBody);
            if (handled) {
                break;
            }
        }
    }

    private processHelpCommand(callbackBody: {group_id: string, text: string, sender_type: string}) {
        let response: string = "Management Commands:\n";
        for (const module of this.modules) {
            response += module.getHelpText();
        }
        this.sendMessage(callbackBody.group_id, response);
    }
}
