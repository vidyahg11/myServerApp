import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BridgeServer } from 'react-native-http-bridge-refurbished';
import { Platform } from 'react-native';
import { openDB, createPipeInfoTable, fetchPipeInfo, createPipeStatusTable, fetchPipeStatus, getPipeInfoById, getPipeStatusById } from './src/db/db-service';
import { validateJsonData } from './src/validate/validation';

const App = () => {
  const [lastCalled, setLastCalled] = useState<number | undefined>();
  const [serverStatus, setServerStatus] = useState<string>('Starting server...');

  useEffect(() => {
    const initializeDB = async () => {
      const db = await openDB();
      if (db) {
        await createPipeInfoTable();
        await createPipeStatusTable();
      }
    };

    initializeDB();
    
    const server = new BridgeServer('http_service', true);

    server.get('/', async (req, res) => {
      console.log('Received GET request');
      // Handle GET request
      setLastCalled(Date.now());

      const pipeEndId = 'F954_1-11_1_11EndB';
      const pipeID = 'F954_1-11_1_11';

      try {
        const pipeInfo = await getPipeInfoById(pipeEndId);
        const pipeStatus = await getPipeStatusById(pipeID);
        res.json({
          message: 'GET request received',
          pipeInfo,
          pipeStatus
        });
      } catch (error) {
        console.error('Error fetching pipe info or status:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    });

    server.put('/', async (req, res) => {
      console.log('Received PUT request');
      // Handle PUT request
      setLastCalled(Date.now());
      return { message: 'PUT request received', data: req.data };
    });

    server.delete('/', async (req, res) => {
      console.log('Received DELETE request');
      // Handle DELETE request
      setLastCalled(Date.now());
      return { message: 'DELETE request received' };
    });

    server.post('/comm_check', async (req, res) => {
      console.log("Received POST request to /com_check");
      setLastCalled(Date.now());
      return { message : 'OptiFit'};
    });

    server.post('/upload', async (req, res) => {
      try {
        setLastCalled(Date.now());
        console.log('Received POST request to /upload');
        let jsonData;
        if (Platform.OS === 'android') {
          try {
            jsonData = req.data;
          } catch (parseError) {
            console.log('Error parsing req.data:', parseError);
            return { message: 'POST request received but data format is invalid', data: null };
          }
        } else if (Platform.OS === 'ios') {
          if (!req.postData) {
            console.log("json data of req.postData is :", req.postData);
            return { message: 'POST request received but no data provided', data: null };
          }
          jsonData = JSON.parse(JSON.stringify(req.postData));
        }

        const validation = validateJsonData(jsonData);
        if (!validation.isValid) {
          console.log("Invalid JSON data");
          return res.json({ message: 'Failure', errors: validation.errors });
        }

        await fetchPipeInfo(jsonData);
        await fetchPipeStatus(jsonData);
        return { message: 'Success', data: jsonData };
      } catch (error) {
        console.log('Error:', error);
        return { message: 'Internal server error' };
      }
    });

    server.listen(3000);
    console.log('Server started on port 3000');
    setServerStatus('Server started on port 3000');
    
    return () => {
      server.stop();
      console.log('Server stopped');
      setServerStatus('Server stopped');
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.status}>{serverStatus}</Text>
      <Text style={styles.text}>
        {lastCalled === undefined
          ? 'Request webserver to change text'
          : 'Called at ' + new Date(lastCalled).toLocaleString()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  status: {
    color: 'yellow',
    marginBottom: 20,
    fontSize: 20,
  },
  text: {
    color: 'white',
    textAlign: 'center',
    fontSize: 25,
  },
});

export default App;
