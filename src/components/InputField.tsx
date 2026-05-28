import React from 'react';

import {
TextInput,
StyleSheet
}
from 'react-native';

export default function InputField(props:any){

return(

<TextInput
{...props}
style={styles.input}
/>

)

}

const styles=StyleSheet.create({

input:{
height:55,
backgroundColor:"white",
borderRadius:15,
paddingHorizontal:15,
marginVertical:10,
fontSize:16,
elevation:3
}

})