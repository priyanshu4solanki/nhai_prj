import React from 'react';

import {
View,
Text,
StyleSheet
}
from 'react-native';

import ButtonPrimary
from '../components/ButtonPrimary';

export default function HomeScreen({
navigation
}:any){

return(

<View style={styles.container}>

<Text style={styles.title}>
Welcome Employee
</Text>

<Text style={styles.subtitle}>
Offline Authentication Ready
</Text>

<ButtonPrimary
title="Start Attendance"
onPress={()=>navigation.navigate(
"Attendance"
)}
/>

</View>

)

}

const styles=StyleSheet.create({

container:{
flex:1,
justifyContent:"center",
padding:30
},

title:{
fontSize:28,
fontWeight:"bold",
textAlign:"center"
},

subtitle:{
fontSize:16,
textAlign:"center",
marginBottom:40
}

})