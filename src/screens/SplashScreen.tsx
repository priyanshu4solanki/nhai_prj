import React,{useEffect} from 'react';

import {
View,
Text,
StyleSheet
}
from 'react-native';

export default function SplashScreen({
navigation
}:any){

useEffect(()=>{

setTimeout(()=>{

navigation.replace("Login")

},2500)

},[])

return(

<View style={styles.container}>

<Text style={styles.logo}>
🛣️
</Text>

<Text style={styles.title}>
NHAI Attendance
</Text>

<Text style={styles.subtitle}>
Offline Face Authentication
</Text>

</View>

)

}

const styles=StyleSheet.create({

container:{
flex:1,
justifyContent:"center",
alignItems:"center",
backgroundColor:"#004C97"
},

logo:{
fontSize:90
},

title:{
fontSize:30,
fontWeight:"bold",
color:"white"
},

subtitle:{
fontSize:16,
marginTop:10,
color:"#DCE6F2"
}

})