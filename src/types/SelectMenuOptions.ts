import type { BaseButtonComponentData } from "discord.js";

export type SelectMenuOptions = {
    /**
     * The maximum number of roles selectable for the select menu.
     * Should not be greater than the number of roles available in the menu.
     *
     * @remarks Do not set this option if you want to create a single-select menu.
     * @default 1
     * @max 25
     * @type {number}
     */
    maxValues?: number;

    /**
     * The minimum number of roles selectable for the select menu.
     *
     * @remarks Do not set this option if you want to create a single-select menu.
     * @min 1
     * @type {number}
     */
    minValues?: number;

    /**
     * The placeholder for the select menu.
     *
     * @default "Select a role"
     * @type {string}
     */
    placeholder?: string;

    /**
     * The button to reset the select menu.
     *
     * @type {BaseButtonComponentData}
     */
    resetButton?: Pick<BaseButtonComponentData, "label" | "emoji" | "style">;
};
