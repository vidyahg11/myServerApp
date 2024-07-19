// db-service.js
import SQLite from 'react-native-sqlite-storage';

//SQLite.DEBUG(true);
SQLite.enablePromise(true);

let db = null;

const openDatabase = async () => {
  try {
    db = await SQLite.openDatabase({name: 'OptiFit.db'});
    console.log('Database opened successfully');
  } catch (error) {
    console.error('Error opening database: ', error);
  }
};

const createTable = async () => {
  try {
    await db.transaction(tx => {
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS pipeData (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          radius TEXT NOT NULL,
          phi TEXT NOT NULL
        );`,
        [],
        () => {
          console.log('Table pipeData created successfully');
        },
        (_, error) => {
          console.error('Error creating table: ', error);
        }
      );
    });
  } catch (error) {
    console.error('Transaction error: ', error);
  }
};

const insertPipeData = async (radiusArray, phiArray) => {
  if (radiusArray.length !== phiArray.length) {
    console.error('The length of radius and phi arrays must be the same.');
    return;
  }

  const radiusString = JSON.stringify(radiusArray);
  const phiString = JSON.stringify(phiArray);

  const query = `INSERT INTO pipeData (radius, phi) VALUES (?, ?)`;

  try {
    await db.transaction(tx => {
      tx.executeSql(
        query,
        [radiusString, phiString],
        (_, { rowsAffected, insertId }) => {
          if (rowsAffected > 0) {
            console.log(`Data inserted successfully with id ${insertId}`);
          } else {
            console.error('Failed to insert data.');
          }
        },
        (_, error) => {
          console.error('Error inserting data: ', error);
        }
      );
    });
  } catch (error) {
    console.error('Transaction error: ', error);
  }
};

export { openDatabase, createTable, insertPipeData };
