import NetInfo from '@react-native-community/netinfo';

export const checkInternetConnectivity = async (): Promise<boolean> => {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected ?? false;
  } catch (error) {
    console.error('Error checking connectivity:', error);
    return false;
  }
};

export const subscribeToConnectivityChanges = (
  callback: (isConnected: boolean) => void
) => {
  const unsubscribe = NetInfo.addEventListener(state => {
    callback(state.isConnected ?? false);
  });
  return unsubscribe;
};

export const getNetworkState = async () => {
  try {
    const state = await NetInfo.fetch();
    return {
      isConnected: state.isConnected ?? false,
      type: state.type,
      details: state.details,
    };
  } catch (error) {
    console.error('Error getting network state:', error);
    return {
      isConnected: false,
      type: 'unknown',
    };
  }
};
