"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  hasFixedDiscordBindings,
  resolveDiscordBinding,
  boundConversationId,
  attachBinding,
} = require("./discord-routing");

test("fixed Discord bindings support three isolated channels and packet propagation", () => {
  const config = {
    discordChannelBindings: {
      chan1: { characterId: "char-a", chatName: "chat-a" },
      chan2: { characterId: "char-a", chatName: "chat-b" },
      chan3: { characterId: "char-b", chatName: "chat-c" },
    },
  };

  assert.equal(hasFixedDiscordBindings(config), true);
  assert.deepEqual(resolveDiscordBinding(config, "chan2"), {
    binding: { characterId: "char-a", chatName: "chat-b" },
    error: null,
  });
  assert.equal(boundConversationId("chan3"), "discord-bound:chan3");
  assert.deepEqual(
    attachBinding({ type: "user_message", chatId: "discord-bound:chan3" }, config.discordChannelBindings.chan3),
    {
      type: "user_message",
      chatId: "discord-bound:chan3",
      binding: { characterId: "char-b", chatName: "chat-c" },
    },
  );
  assert.deepEqual(
    attachBinding(
      { type: "execute_command", command: "swipe", chatId: "discord-bound:chan2" },
      config.discordChannelBindings.chan2,
    ).binding,
    { characterId: "char-a", chatName: "chat-b" },
  );
});

test("fixed routing rejects an unbound Discord channel", () => {
  assert.match(
    resolveDiscordBinding(
      { discordChannelBindings: { chan1: { characterId: "char", chatName: "chat" } } },
      "chan9",
    ).error,
    /not configured/i,
  );
});
