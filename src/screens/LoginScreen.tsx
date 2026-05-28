import React,{useState} from 'react';

import {
View,
Text,
StyleSheet
}
from 'react-native';

import InputField from
'../components/InputField';

import ButtonPrimary from
'../components/ButtonPrimary';

export default function LoginScreen({
navigation
}:any){

const[id,setId]=
useState("");

const[password,setPassword]=
useState("");

return(

<View style={styles.container}>

<Text style={styles.heading}>
NHAI Login
</Text>

<View style={styles.card}>

<InputField
placeholder="Employee ID"
value={id}
onChangeText={setId}
/>

<InputField
placeholder="Password"
secureTextEntry
value={password}
onChangeText={setPassword}
/>

<ButtonPrimary
title="LOGIN"
onPress={()=>navigation.navigate(
"Home"
)}
/>

</View>

</View>

)

}

const styles=StyleSheet.create({

container:{
flex:1,
justifyContent:"center",
padding:25,
backgroundColor:"#F2F5F8"
},

heading:{
fontSize:30,
fontWeight:"bold",
textAlign:"center",
marginBottom:25,
color:"#004C97"
},

card:{
backgroundColor:"white",
padding:25,
borderRadius:25,
elevation:10
}

})