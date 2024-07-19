import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BridgeServer } from 'react-native-http-bridge-refurbished';
import { openDatabase, createTable, insertPipeData } from './db-service';


const App = () => {
  const [lastCalled, setLastCalled] = useState<number | undefined>();
  const [serverStatus, setServerStatus] = useState<string>('Starting server...');

  useEffect(() => {
    const initializeDatabase = async () => {
      await openDatabase();
      await createTable();
    };

    initializeDatabase();
    
    const server = new BridgeServer('http_service', true);

    server.get('/', async (req, res) => {
      console.log('Received GET request');
      // Handle GET request
      setLastCalled(Date.now());
      return { message: 'GET request received' };
    });

    server.post('/', async (req, res) => {
      console.log('Received POST request');
      // Handle POST request
      setLastCalled(Date.now());
      return { message: 'POST request received', data: req.data };
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
      console.log('Received POST request to /upload');
      setLastCalled(Date.now());
      const jsonData = req.data;
      if (jsonData && jsonData.Data && Array.isArray(jsonData.Data.radius) && Array.isArray(jsonData.Data.phi)) {
        insertPipeData(jsonData.Data.radius, jsonData.Data.phi);
      }

      return { message: 'File received', data: jsonData };
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
