import React, {useEffect} from 'react';

import {
View,
ActivityIndicator,
StyleSheet
} from 'react-native';

import AppNavigator from './src/navigation/AppNavigator';

import {
initializeDatabase
}
from './src/services/databaseService';

function App(): JSX.Element {

useEffect(() => {

setupApp();

},[]);

const setupApp = async()=>{

try{

const result=
await initializeDatabase();

console.log(
"Database initialized:",
result
);

}catch(error){

console.log(
"Database Error:",
error
);

}

};

return(

<View style={styles.container}>

<AppNavigator/>

</View>

);

}

const styles=StyleSheet.create({

container:{
flex:1
}

});

export default App;