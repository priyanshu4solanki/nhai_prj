import React from 'react';
import {
TouchableOpacity,
Text,
StyleSheet
} from 'react-native';

export default function ButtonPrimary({
title,
onPress
}:any){

return(

<TouchableOpacity
style={styles.button}
onPress={onPress}
>

<Text style={styles.text}>
{title}
</Text>

</TouchableOpacity>

)

}

const styles=StyleSheet.create({

button:{
backgroundColor:"#004C97",
padding:16,
borderRadius:15,
alignItems:"center",
marginTop:15,
elevation:6
},

text:{
fontSize:18,
fontWeight:"bold",
color:"white"
}

});