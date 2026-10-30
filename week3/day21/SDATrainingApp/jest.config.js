module.exports = {
  preset: '@react-native/jest-preset',

  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native|@react-native-async-storage|@react-native-community|@react-navigation|@reduxjs|immer|react-redux|redux|redux-thunk|reselect|react-native-notify-kit|react-native-reanimated|react-native-gesture-handler)/)',
  ],
};
