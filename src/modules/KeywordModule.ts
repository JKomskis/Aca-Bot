import config from "config";
import { readFileSync, writeFile } from "fs";
import { Server } from "../Server";
import { Logger } from "../utils/logger";
import { IModule } from "./IModule";

export class KeywordModule implements IModule {
    private logger: Logger;

    private addMessageSyntaxErrorMessage: string = "Invalid Syntax. Usage: /addmessage" +
                                                    "\"<keyword phrase>\" \"<Response message>\"";
    private removeMessageSyntaxErrorMessage: string = "Invalid Syntax. Usage: /removemessage \"<keyword phrase>\"";
    private removeMessageNotFound: string = "Keyword phrase not found.";
    private server: Server;
    private keywords: {keywords: Array<{regExp: string, response: string}>};
    private regexpMatches: Map<string, RegExp>;
    private regExpFlags = "mi";

    public constructor(server: Server) {
        this.logger = new Logger("KeywordModule");

        this.server = server;
        this.regexpMatches = new Map<string, RegExp>();

        this.keywords = {keywords: []};
        if (config.has("keyword_config_file")) {
            this.keywords = JSON.parse(readFileSync(config.get<string>("keyword_config_file"),
                                                  {encoding: "utf8"}));

        } else {
            this.logger.warn("Keyword config file not found");
        }

        for (const keyword of this.keywords.keywords) {
            const regExp = new RegExp(keyword.regExp, this.regExpFlags);
            this.regexpMatches.set(keyword.regExp, regExp);
        }

        server.subscribeToMessages(this);
        server.subscribeToManagementCommands(this);
    }

    public processMessage(request: {group_id: string, text: string}): boolean {
        this.logger.info("Processing message");
        for (const keyword of this.keywords.keywords) {
            const regExp = this.regexpMatches.get(keyword.regExp);
            if (regExp === undefined) {
                this.logger.error("RegExp %s not in map", keyword.regExp);
                return false;
            }

            this.logger.debug("Regexp: %s Response: %s Message: %s", regExp.source, keyword.response, request.text);
            this.logger.debug("Match? %s", regExp.test(request.text));
            if (regExp.test(request.text)) {
                this.logger.info("Found match for keyword");
                this.server.sendMessage(request.group_id, keyword.response);
                return true;
            }
        }
        this.logger.info("No keyword matches");
        return false;
    }

    public processCommand(request: {group_id: string, text: string}): boolean {
        if (request.text.startsWith("/addmessage")) {
            this.addMessage(request);
            return true;
        } else if (request.text.startsWith("/listmessages")) {
            this.listMessages(request);
            return true;
        } else if (request.text.startsWith("/removemessage")) {
            this.removeMessage(request);
            return true;
        }

        return false;
    }

    public getHelpText(): string {
        return '/addmessage "<keyword phrase>" "<response>"\n' +
               "/listmessages\n" +
               '/removemessage "<keyword phrase>"';
    }

    private persistKeywords() {
        if (config.has("keyword_config_file")) {
            writeFile(config.get<string>("keyword_config_file"), JSON.stringify(this.keywords, null, 2), (error) => {
                if (error) {
                    this.logger.error("Error writing keyword file.");
                    this.logger.error("%d %s", error.errno, error.message);
                } else {
                    this.logger.info("Keyword file updated.");
                }
            });
        }
    }

    private addMessage(request: {group_id: string, text: string}) {
        const keywordStart: number = request.text.indexOf('"');
        if (keywordStart === -1) {
            this.server.sendMessage(request.group_id, this.addMessageSyntaxErrorMessage);
        }

        let keywordEnd: number = request.text.indexOf('"', keywordStart + 1);
        while (keywordEnd !== -1 && request.text.charAt(keywordEnd - 1) === "\\") {
            keywordEnd = request.text.indexOf('"', keywordEnd + 1);
        }
        if (keywordEnd === -1) {
            this.server.sendMessage(request.group_id, this.addMessageSyntaxErrorMessage);
        }

        const responseStart: number = request.text.indexOf('"', keywordEnd + 1);
        if (responseStart === -1) {
            this.server.sendMessage(request.group_id, this.addMessageSyntaxErrorMessage);
        }

        let responseEnd: number = request.text.indexOf('"', responseStart + 1);
        while (responseEnd !== -1 && request.text.charAt(responseEnd - 1) === "\\") {
            responseEnd = request.text.indexOf('"', responseEnd + 1);
        }
        if (responseEnd === -1) {
            this.server.sendMessage(request.group_id, this.addMessageSyntaxErrorMessage);
        }

        const keyword = request.text.substring(keywordStart + 1, keywordEnd);
        const regExp = new RegExp(keyword, this.regExpFlags);
        const response = request.text.substring(responseStart + 1, responseEnd);

        this.regexpMatches.set(keyword, regExp);
        const idx = this.keywords.keywords.findIndex((element) => element.regExp === keyword);
        if (idx !== -1) {
            this.keywords.keywords[idx].response = response;
            this.server.sendMessage(request.group_id, "Message updated.");
        } else {
            this.keywords.keywords.push({regExp: keyword, response});
            this.server.sendMessage(request.group_id, "Message added.");
        }

        this.persistKeywords();
    }

    private listMessages(request: {group_id: string, text: string}) {
        let response: string = "";
        if (this.keywords.keywords.length === 0) {
            response = "No messages added.";
        } else {
            response = "Messages:";
            let responseNum: number = 1;
            for (const keyword of this.keywords.keywords) {
                response += `\n${responseNum++}. "${keyword.regExp}" "${keyword.response}"`;
            }
        }

        this.server.sendMessage(request.group_id, response);
    }

    private removeMessage(request: {group_id: string, text: string}) {
        const keywordStart: number = request.text.indexOf('"');
        if (keywordStart === -1) {
            this.server.sendMessage(request.group_id, this.removeMessageSyntaxErrorMessage);
        }

        let keywordEnd: number = request.text.indexOf('"', keywordStart + 1);
        while (keywordEnd !== -1 && request.text.charAt(keywordEnd - 1) === "\\") {
            keywordEnd = request.text.indexOf('"', keywordEnd + 1);
        }
        if (keywordEnd === -1) {
            this.server.sendMessage(request.group_id, this.removeMessageSyntaxErrorMessage);
        }

        const keyword = request.text.substring(keywordStart + 1, keywordEnd);
        const regExp = new RegExp(keyword, this.regExpFlags);

        if (this.keywords.keywords.findIndex((element) => element.regExp === keyword) === -1) {
            this.server.sendMessage(request.group_id, this.removeMessageNotFound);
        } else {
            this.regexpMatches.delete(keyword);
            this.keywords.keywords.splice(this.keywords.keywords.findIndex((element) => element.regExp === keyword), 1);

            this.persistKeywords();
            this.server.sendMessage(request.group_id, "Message deleted.");
        }
    }
}
