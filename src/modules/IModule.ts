export interface IModule {
    processMessage(request: {group_id: string, text: string}): boolean;
    processCommand(request: {group_id: string, text: string}): boolean;
    getHelpText(): string;
}