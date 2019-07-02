import { Request, Response, Router } from "express";
import { inspect } from "util";
import { Server } from "../Server";
import { Logger } from "../utils/logger";

export class CallbackRoute {
    private logger: Logger;
    private server: Server;

    constructor(server: Server) {
        this.logger = new Logger("CallbackRoute");
        this.server = server;
    }

    public create(router: Router) {
        this.logger.info("Creating callback route");

        router.post("/", (req: Request, res: Response) => {
            res.status(200).send();
            this.logger.info("Callback received:\n%s", inspect(req.body));
            this.server.processCallback(req.body);
        });
    }

}