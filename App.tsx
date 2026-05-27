import React, {useEffect} from 'react';
import {View, Text} from 'react-native';

import {initializeDatabase} from './src/services/databaseService';

function App(): JSX.Element {

  useEffect(() => {
    testDatabase();
  }, []);

  const testDatabase = async () => {

    const result = await initializeDatabase();

    console.log(result);
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      }}>

      <Text>SQLite Testing</Text>

    </View>
  );
}

export default App;