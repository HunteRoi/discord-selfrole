import { Client, ClientOptions } from 'discord.js';

import { SelfRoleManager } from './SelfRoleManager';
import { SelfRoleOptions } from './types';

/**
 * A wrapper of {@link Client} that provides a support for the SelfRoleManager.
 * @export
 * @class ClientWithSelfRoleManager
 * @extends {Client}
 */
export class ClientWithSelfRoleManager extends Client {
  /**
   * An instance of {@link SelfRoleManager} that currently manages all the channels which have automated role-react messages for the client.
   *
   * @name ClientWithSelfRoleManager#selfRoleManager
   * @type {SelfRoleManager}
   */
  public readonly selfRoleManager: SelfRoleManager;

  /**
   * Creates an instance of ClientWithSelfRoleManager.
   * @param {ClientOptions} [options] Options for the client
   * @param {SelfRoleOptions} [selfRoleOptions={
   *     deleteAfterUnregistration: false
   *     channelsMessagesFetchLimit: 3
   *   }]
   */
  constructor(
    options: ClientOptions,
    selfRoleOptions: SelfRoleOptions = {
      deleteAfterUnregistration: false,
      channelsMessagesFetchLimit: 3,
    },
  ) {
    super(options);

    this.selfRoleManager = new SelfRoleManager(this, selfRoleOptions);
  }
}
