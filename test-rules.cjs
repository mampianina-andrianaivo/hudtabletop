const firebase = require('@firebase/rules-unit-testing');
const fs = require('fs');

async function run() {
  const projectId = "test-project-" + Date.now();
  const testEnv = await firebase.initializeTestEnvironment({
    projectId: projectId,
    firestore: {
      rules: fs.readFileSync('firestore.rules', 'utf8'),
    },
  });

  const db = testEnv.unauthenticatedContext().firestore();
  
  // Test writing to player
  try {
    await db.doc('rooms/ROOM1/players/ABCDE').set({
      pseudo: 'Player1',
      role: 'player',
      isGm: false,
      slots: '{"some":"state"}',
      rollState: 'idle',
      rolledValue: null
    }, { merge: true });
    console.log("Player write success");
  } catch (e) {
    console.error("Player write failed:", e.message);
  }

  // Test writing to gm state
  try {
    await db.doc('rooms/ROOM1/gm/state').set({
      rollState: 'idle',
      diceResult: '[]',
      checkedEncounters: '[]',
      encounterRolls: '[]',
      encounterLevel: '1'
    }, { merge: true });
    console.log("GM write success");
  } catch (e) {
    console.error("GM write failed:", e.message);
  }
}

run().then(() => process.exit(0));
