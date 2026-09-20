"use strict";

function hasFixedDiscordBindings(config) {
  return Object.prototype.hasOwnProperty.call(config, "discordChannelBindings");
}

function resolveDiscordBinding(config, channelId) {
  if (!hasFixedDiscordBindings(config)) return { binding: null, error: null };

  const binding = config.discordChannelBindings[String(channelId)];
  if (!binding) {
    return {
      binding: null,
      error: `Discord channel ${channelId} is not configured for a SillyTavern chat.`,
    };
  }
  return { binding, error: null };
}

function boundConversationId(channelId) {
  return `discord-bound:${channelId}`;
}

function attachBinding(packet, binding) {
  return binding ? { ...packet, binding } : packet;
}

module.exports = {
  hasFixedDiscordBindings,
  resolveDiscordBinding,
  boundConversationId,
  attachBinding,
};
