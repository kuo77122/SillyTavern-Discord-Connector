import test from "node:test";
import assert from "node:assert/strict";
import {
  activateBoundChat,
  createChatInteractionQueue,
  isFixedRouteEscapeCommand,
} from "./chat-routing.mjs";

test("fixed-bound escape commands are rejected", () => {
  for (const command of [
    "newchat",
    "switchchar",
    "switchchar_2",
    "switchchat",
    "switchchat_3",
    "switchgroup",
    "switchgroup_4",
  ]) {
    assert.equal(isFixedRouteEscapeCommand(command), true, command);
  }
  assert.equal(isFixedRouteEscapeCommand("delete"), false);
});

test("bound target activation validates before mutating and supports distinct chats", async () => {
  const calls = [];
  const context = {
    characters: [
      { id: "char-a", name: "Alice" },
      { id: "char-b", name: "Bob" },
    ],
  };
  const chats = [
    { file_name: "chat-a.jsonl" },
    { file_name: "chat-b.jsonl" },
  ];

  await activateBoundChat(
    { characterId: "char-a", chatName: "chat-b" },
    {
      context,
      getPastCharacterChats: async (characterIndex) => {
        calls.push(["list", characterIndex]);
        return chats;
      },
      selectCharacterById: async (index) => calls.push(["select", index]),
      openCharacterChat: async (name) => calls.push(["open", name]),
    },
  );

  assert.deepEqual(calls, [["list", 0], ["select", 0], ["open", "chat-b.jsonl"]]);
});

test("bound target activation fails closed for missing or ambiguous targets", async () => {
  const calls = [];
  const deps = {
    context: { characters: [{ id: "char-a" }, { id: "char-a" }] },
    getPastCharacterChats: async () => [{ file_name: "chat-a.jsonl" }],
    selectCharacterById: async () => calls.push("select"),
    openCharacterChat: async () => calls.push("open"),
  };

  await assert.rejects(
    activateBoundChat({ characterId: "char-missing", chatName: "chat-a" }, deps),
    /unavailable/i,
  );
  await assert.rejects(
    activateBoundChat({ characterId: "char-a", chatName: "chat-a" }, deps),
    /ambiguous/i,
  );
  assert.deepEqual(calls, []);
});

test("global FIFO continues after rejection and preserves interleaving order", async () => {
  const queue = createChatInteractionQueue();
  const order = [];
  const tasks = ["chan1", "chan2", "chan3"].map((channel, index) =>
    queue.enqueue(async () => {
      order.push(`${channel}:start`);
      if (index === 1) throw new Error("rejected target");
      order.push(`${channel}:done`);
    }),
  );

  await Promise.allSettled(tasks);
  await queue.enqueue(async () => order.push("chan1:recovered"));
  assert.deepEqual(order, [
    "chan1:start",
    "chan1:done",
    "chan2:start",
    "chan3:start",
    "chan3:done",
    "chan1:recovered",
  ]);
});
