import SQLite from 'react-native-sqlite-storage';
import { PermissionsAndroid, Platform } from 'react-native';
 
let db = null;

export const askStoragePermission = async () => {
  if (Platform.OS === "android") {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        {
          title: "This app Write logs to Storage",
          message: "Your app needs permission to write logs to storage.",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK",
        }
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log("db-service", "askStoragePermission", "Permission granted");
        return true;
      } else {
        console.log("db-service", "askStoragePermission", "Permission denied");
        return false;
      }
    } catch (err) {
      console.warn(err);
      return false;
    }
  } else {
    return true;
  }
};
 
export const openDB = async () => {
  if (!db) {
    const granted = await askStoragePermission();
    if (granted) {
      db = await SQLite.openDatabase({ name: "OptiFit.db" }, 
        () => console.log("db-service", "openDB", "Database opened successfully"), 
        (error) => console.error("Failed to open database", error)
      );
    } else {
      console.error("Storage permission not granted. Cannot open database.");
    }
  }

  return db;
};
 
export const createPipeInfoTable = async () => {
  try {
    await db.transaction(tx => {
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS PipeInfo (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          projectNumber VARCHAR(30) NOT NULL,
          pipeEndID VARCHAR(30) NOT NULL UNIQUE,
          projectName VARCHAR(30) NOT NULL,
          customerName VARCHAR(30) NOT NULL,
          projectManagerName VARCHAR(30),
          technicianName VARCHAR(30) NOT NULL,
          groupID VARCHAR(30) NOT NULL,
          pipeLength FLOAT NOT NULL,
          pipeDia FLOAT NOT NULL,
          pipeMaterial VARCHAR(30),
          pipeThickness VARCHAR(30),
          pipeType TEXT NOT NULL CHECK (pipeType IN ('Single', 'Double')),
          sampleSize INT NOT NULL,
          siteName VARCHAR(30),
          latitude VARCHAR(30),
          longitude VARCHAR(30),
          timestamp DATETIME NOT NULL,
          radius JSON NOT NULL,
          phi JSON NOT NULL,
          maxID FLOAT,
          minID FLOAT,
          avgID FLOAT,
          ooR FLOAT
        );`,
        [],
        () => {
          console.log('Table PipeInfo created successfully');
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

export const fetchPipeInfo = async (jsonData) => {
  const pipeEndID = `${jsonData.pipeinfo.pipe_name}${jsonData.pipeinfo.pipe_end}`;
  try {
    await db.transaction(tx => {
      tx.executeSql(
        `SELECT * FROM PipeInfo WHERE pipeEndID = ?`,
        [pipeEndID],
        (_, result) => {
          if (result.rows.length > 0) {
            // Record exists, update it
            const existingRecord = result.rows.item(0);
            updatePipeInfo(existingRecord, jsonData);
          } else {
            // Record does not exist, insert it
            insertPipeInfo(jsonData);
          }
        },
        (_, error) => console.error('Error fetching PipeInfo records: ', error)
      );
    });
  } catch (error) {
    console.error('Transaction error(fetchPipeInfo): ', error);
  }
};

const insertPipeInfo = async (jsonData) => {
  const { projectInfo, pipeinfo, Data } = jsonData;
  const pipeEndID = `${pipeinfo.pipe_name}${pipeinfo.pipe_end}`;
  const radiusString = JSON.stringify(Data.radius);
  const phiString = JSON.stringify(Data.phi);
  const maxID = Math.max(...Data.radius).toFixed(3);
  const minID = Math.min(...Data.radius).toFixed(3);
  const avgID = (Data.radius.reduce((sum, val) => sum + val, 0) / Data.radius.length).toFixed(3);
  const ooR = (maxID - minID).toFixed(3);

  const insertQuery = `INSERT INTO PipeInfo (
          projectNumber, pipeEndID, projectName, customerName, projectManagerName,
          technicianName, groupID, pipeLength, pipeDia, pipeMaterial, pipeThickness,
          pipeType, sampleSize, siteName, latitude, longitude, timestamp, radius, phi,
          maxID, minID, avgID, ooR
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  try {
    await db.transaction(tx => {
      tx.executeSql(
        insertQuery,
        [
          projectInfo.project_num, pipeEndID, projectInfo.project_name, projectInfo.customer_name,
          projectInfo.project_manager, pipeinfo.technician_name, pipeinfo.group_id,
          parseFloat(pipeinfo.pipe_length), parseFloat(pipeinfo.pipe_OD), pipeinfo.material,
          pipeinfo.thickness, pipeinfo.type, parseInt(pipeinfo.sample_size, 10),
          pipeinfo.location.site_name, pipeinfo.location.latitude, pipeinfo.location.longitude,
          new Date(pipeinfo.timestamp * 1000).toISOString(), radiusString, phiString,
          maxID, minID, avgID, ooR
        ],
        (_, { insertId }) => {
          if (insertId) {
            console.log(`Data inserted successfully with id ${insertId}`);
          } else {
            console.error('Failed to insert data.');
          }
        },
        (_, error) => console.error('Error inserting data: ', error)
      );
    });
  } catch (error) {
    console.error('Transaction error(insertPipeInfo): ', error);
  }
};

const updatePipeInfo = async (existingRecord, jsonData) => {
  const { projectInfo, pipeinfo, Data } = jsonData;
  const radiusString = JSON.stringify(Data.radius);
  const phiString = JSON.stringify(Data.phi);
  const maxID = Math.max(...Data.radius).toFixed(3);
  const minID = Math.min(...Data.radius).toFixed(3);
  const avgID = (Data.radius.reduce((sum, val) => sum + val, 0) / Data.radius.length).toFixed(3);
  const ooR = (maxID - minID).toFixed(3);

  const updateQuery = `UPDATE PipeInfo SET
            projectNumber = ?, projectName = ?, customerName = ?, projectManagerName = ?, technicianName = ?,
            groupID = ?, pipeLength = ?, pipeDia = ?, pipeMaterial = ?, pipeThickness = ?, pipeType = ?,
            sampleSize = ?, siteName = ?, latitude = ?, longitude = ?, timestamp = ?, radius = ?, phi = ?,
            maxID = ?, minID = ?, avgID = ?, ooR = ?
            WHERE pipeEndID = ?`;

  try {
    await db.transaction(tx => {
      tx.executeSql(
        updateQuery,
        [
          projectInfo.project_num, projectInfo.project_name, projectInfo.customer_name,
          projectInfo.project_manager, pipeinfo.technician_name, pipeinfo.group_id,
          parseFloat(pipeinfo.pipe_length), parseFloat(pipeinfo.pipe_OD), pipeinfo.material,
          pipeinfo.thickness, pipeinfo.type, parseInt(pipeinfo.sample_size, 10),
          pipeinfo.location.site_name, pipeinfo.location.latitude, pipeinfo.location.longitude,
          new Date(pipeinfo.timestamp * 1000).toISOString(), radiusString, phiString,
          maxID, minID, avgID, ooR, existingRecord.pipeEndID
        ],
        (_, { rowsAffected }) => {
          if (rowsAffected > 0) {
            console.log(`Data updated successfully for pipeEndID ${existingRecord.pipeEndID}`);
          } else {
            console.error('Failed to update data.');
          }
        },
        (_, error) => console.error('Error updating data: ', error)
      );
    });
  } catch (error) {
    console.error('Transaction error(updatePipeInfo): ', error);
  }
};
 
const StatusEnum = {
  AVAILABLE: 'Available',
  USED: 'Used',
  MISSING_ENDA: 'Missing EndA',
  MISSING_ENDB: 'Missing EndB',
};

export const createPipeStatusTable = async () => {
  try {
    await db.transaction(tx => {
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS PipeStatus (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          projectNumber VARCHAR(30) NOT NULL,
          pipeID VARCHAR(30) NOT NULL,
          pipeEndIDA VARCHAR(10),
          pipeEndIDB VARCHAR(10),
          status TEXT NOT NULL CHECK (status IN ('Available', 'Used', 'Missing EndA', 'Missing EndB')),
          reasonForDiscard VARCHAR(30),
          createdAt VARCHAR(30),
          spreadID VARCHAR(30),
          subSpreadID VARCHAR(30),
          usedSpreadID FLOAT,
          usedSubSpreadID FLOAT,
          UNIQUE (projectNumber, pipeID)
        );`,
        [],
        () => console.log('Table PipeStatus created successfully'),
        (_, error) => console.error('Error creating table PipeStatus: ', error)
      );
    });
  } catch (error) {
    console.error('Transaction error: ', error);
  }
};

export const fetchPipeStatus = async (jsonData) => {
  const { pipeinfo } = jsonData;
  const pipeID = pipeinfo.pipe_name;
  const projectNumber = jsonData.projectInfo.project_num;
  try {
    await db.transaction(tx => {
      tx.executeSql(
        `SELECT * FROM PipeStatus WHERE projectNumber = ? AND pipeID = ?`,
        [projectNumber, pipeID],
        (_, result) => {
          if (result.rows.length > 0) {
            // Record exists, update it
            const existingRecord = result.rows.item(0);
            updatePipeStatus(existingRecord, jsonData);
          } else {
            // Record does not exist, insert it
            insertPipeStatus(jsonData);
          }
        },
        (_, error) => console.error('Error fetching PipeStatus records: ', error)
      );
    });
  } catch (error) {
    console.error('Transaction error(fetchPipeStatus): ', error);
  }
};

const insertPipeStatus = async (jsonData) => {
  const { pipeinfo } = jsonData;
  const pipeID = pipeinfo.pipe_name;
  const pipeEndID = pipeinfo.pipe_end;
  const projectNumber = jsonData.projectInfo.project_num;

  // Determine pipeEndIDA, pipeEndIDB, and status
  const pipeEndIDA = pipeEndID === 'EndA' ? pipeEndID : null;
  const pipeEndIDB = pipeEndID === 'EndB' ? pipeEndID : null;

  let status;
  if (pipeEndIDA && pipeEndIDB) {
    status = StatusEnum.AVAILABLE;
  } else if (pipeEndIDA && !pipeEndIDB) {
    status = StatusEnum.MISSING_ENDB;
  } else if (!pipeEndIDA && pipeEndIDB) {
    status = StatusEnum.MISSING_ENDA;
  }

  try {
    await db.transaction(tx => {
      tx.executeSql(
        `INSERT INTO PipeStatus (
          projectNumber, pipeID, pipeEndIDA, pipeEndIDB, status
        ) VALUES (?, ?, ?, ?, ?)`,
        [projectNumber, pipeID, pipeEndIDA, pipeEndIDB, status],
        (_, { insertId }) => {
          if (insertId) {
            console.log(`PipeStatus data inserted successfully with id ${insertId}`);
          } else {
            console.error('Failed to insert PipeStatus data.');
          }
        },
        (_, error) => console.error('Error inserting PipeStatus data: ', error)
      );
    });
  } catch (error) {
    console.error('Transaction error(insertPipeStatus): ', error);
  }
};

const updatePipeStatus = async (existingRecord, jsonData) => {
  const pipeEndID = jsonData.pipeinfo.pipe_end;
  //const pipeID = jsonData.pipeinfo.pipe_name;

  // Determine new values for pipeEndIDA, pipeEndIDB, and status
  const newPipeEndIDA = existingRecord.pipeEndIDA || (pipeEndID === 'EndA' ? pipeEndID : null);
  const newPipeEndIDB = existingRecord.pipeEndIDB || (pipeEndID === 'EndB' ? pipeEndID : null);

  let status;
  if (newPipeEndIDA && newPipeEndIDB) {
    status = StatusEnum.AVAILABLE;
  } else if (newPipeEndIDA && !newPipeEndIDB) {
    status = StatusEnum.MISSING_ENDB;
  } else if (!newPipeEndIDA && newPipeEndIDB) {
    status = StatusEnum.MISSING_ENDA;
  }

  try {
    await db.transaction(tx => {
      tx.executeSql(
        `UPDATE PipeStatus SET pipeEndIDA = ?, pipeEndIDB = ?, status = ? WHERE projectNumber = ? AND pipeID = ?`,
        [newPipeEndIDA, newPipeEndIDB, status, existingRecord.projectNumber, existingRecord.pipeID],
        (_, { rowsAffected }) => {
          if (rowsAffected > 0) {
            console.log('PipeStatus record updated successfully');
          } else {
            console.error('Failed to update PipeStatus record.');
          }
        },
        (_, error) => console.error('Error updating PipeStatus record: ', error)
      );
    });
  } catch (error) {
    console.error('Transaction error(updatePipeStatus): ', error);
  }
};

export const getPipeInfoById = async (pipeEndId) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM PipeInfo WHERE pipeEndId = ?',
        [pipeEndId],
        (tx, results) => {
          const len = results.rows.length;
          if (len > 0) {
            const data = [];
            for (let i = 0; i < len; i++) {
              data.push(results.rows.item(i));
            }
            resolve(data);
          } else {
            resolve([]);
          }
        },
        (error) => {
          reject(error);
        }
      );
    });
  });
};

export const getPipeStatusById = async (pipeID) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM PipeStatus WHERE pipeID = ?',
        [pipeID],
        (tx, results) => {
          const len = results.rows.length;
          if (len > 0) {
            const data = [];
            for (let i = 0; i < len; i++) {
              data.push(results.rows.item(i));
            }
            resolve(data);
          } else {
            resolve([]);
          }
        },
        (error) => {
          reject(error);
        }
      );
    });
  });
};
