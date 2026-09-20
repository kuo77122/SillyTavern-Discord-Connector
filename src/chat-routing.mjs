const ESCAPE_COMMANDS = /^(?:newchat|switchchar(?:_\d+)?|switchchat(?:_\d+)?|switchgroup(?:_\d+)?)$/;

export function isFixedRouteEscapeCommand(command) {
  return ESCAPE_COMMANDS.test(String(command || ""));
}

export function createChatInteractionQueue() {
  let tail = Promise.resolve();

  return {
    enqueue(task) {
      const run = tail.then(task);
      // ponytail: one global FIFO is required here; use per-chat workers only
      // when sustained queue wait exceeds 30 seconds or parallel generation is needed.
      tail = run.catch(() => {});
      return run;
    },
  };
}

function normalizedChatName(name) {
  return String(name || "").replace(/\.jsonl$/, "");
}

export async function activateBoundChat(
  binding,
  { context, getPastCharacterChats, selectCharacterById, openCharacterChat },
) {
  if (!binding?.characterId || !binding?.chatName) {
    throw new Error("This Discord channel has an invalid SillyTavern chat binding.");
  }

  const characters = Array.isArray(context?.characters) ? context.characters : [];
  const characterMatches = characters.filter(
    (character) => String(character?.id || "") === String(binding.characterId),
  );
  if (characterMatches.length !== 1) {
    throw new Error(
      characterMatches.length === 0
        ? `SillyTavern character ${binding.characterId} is unavailable.`
        : `SillyTavern character ${binding.characterId} is ambiguous.`,
    );
  }

  const characterIndex = characters.indexOf(characterMatches[0]);
  const chatFiles = await getPastCharacterChats(characterIndex);
  const chatMatches = (Array.isArray(chatFiles) ? chatFiles : []).filter(
    (chat) =>
      normalizedChatName(chat?.file_name) === normalizedChatName(binding.chatName),
  );
  if (chatMatches.length !== 1) {
    throw new Error(
      chatMatches.length === 0
        ? `SillyTavern chat ${binding.chatName} is unavailable for character ${binding.characterId}.`
        : `SillyTavern chat ${binding.chatName} is ambiguous for character ${binding.characterId}.`,
    );
  }

  await selectCharacterById(characterIndex);
  await openCharacterChat(chatMatches[0].file_name);
}
