import React from 'react';

import {
View,
Text,
StyleSheet
}
from 'react-native';

export default function FaceGuide(){

return(

<>

<View style={styles.circle}/>

<Text style={styles.text}>
Align Face
</Text>

</>

)

}

const styles=StyleSheet.create({

circle:{
position:'absolute',
width:250,
height:320,
borderWidth:4,
borderColor:"#00FF66",
borderRadius:140,
alignSelf:"center",
top:"25%"
},

text:{
position:'absolute',
top:"62%",
alignSelf:"center",
fontSize:18,
fontWeight:"bold",
color:"white"
}

})