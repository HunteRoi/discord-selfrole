import type {
    ButtonInteraction,
    MessageReaction,
    PartialMessageReaction,
} from "discord.js";

export type UserAction =
    | ButtonInteraction
    | MessageReaction
    | PartialMessageReaction
    | null;
