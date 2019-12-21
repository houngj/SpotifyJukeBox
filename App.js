import React, { Component } from 'react';
import { Text, View } from 'react-native';
import {AuthSession} from 'expo';
import { encode as btoa } from 'base-64';
import SpotifyWebAPI from 'spotify-web-api-js';

const getSpotifyCredentials = async () => {
  const clientId = '';
  const clientSecret = '';
  const redirectUri = '';
  const spotifyCredentials = { clientId, clientSecret, redirectUri };
  return spotifyCredentials
}

const scopesArr = ['user-modify-playback-state','user-read-currently-playing','user-read-playback-state','user-library-modify',
                   'user-library-read','playlist-read-private','playlist-read-collaborative','playlist-modify-public',
                   'playlist-modify-private','user-read-recently-played','user-top-read'];
const scopes = scopesArr.join(' ');

const getAuthorizationCode = async () => {
  try {
    const credentials = await getSpotifyCredentials() //we wrote this function above
    const redirectUrl = AuthSession.getRedirectUrl(); //this will be something like https://auth.expo.io/@your-username/your-app-slug
    const result = await AuthSession.startAsync({
      authUrl:
        'https://accounts.spotify.com/authorize' +
        '?response_type=code' +
        '&client_id=' +
        credentials.clientId +
        (scopes ? '&scope=' + encodeURIComponent(scopes) : '') +
        '&redirect_uri=' +
        encodeURIComponent(redirectUrl),
    })
    return result.params.code
  } catch (err) {
    console.error(err)
  }
}

var access_token = '';
var refresh_token = '';
var expires_in = '';

const getUserData = async (property) => {
  if(property === 'refreshToken')
    return refresh_token;
  if(property === 'expirationTime')
    return expires_in;
  if(property === 'accessToken')
    return access_token;
}

const setUserData = async(property, value) => {
  if(property === 'refreshToken')
    refresh_token = value;
  if(property === 'expirationTime')
    expires_in = value;
  if(property === 'accessToken')
    access_token = value;
}

const getTokens = async () => {
  try {
    const authorizationCode = await getAuthorizationCode() //we wrote this function above
    const credentials = await getSpotifyCredentials() //we wrote this function above (could also run this outside of the functions and store the credentials in local scope)
    const credsB64 = btoa(`${credentials.clientId}:${credentials.clientSecret}`);
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credsB64}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `grant_type=authorization_code&code=${authorizationCode}&redirect_uri=${
        credentials.redirectUri
      }`,
    });
    const responseJson = await response.json();
    // destructure the response and rename the properties to be in camelCase to satisfy my linter ;)
    const {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresIn,
    } = responseJson;

    const expirationTime = new Date().getTime() + expiresIn * 1000;
    await setUserData('accessToken', accessToken);
    await setUserData('refreshToken', refreshToken);
    await setUserData('expirationTime', expirationTime);
  } catch (err) {
    console.error(err);
  }
}

export const refreshTokens = async () => {
  try {
    const credentials = await getSpotifyCredentials() //we wrote this function above
    const credsB64 = btoa(`${credentials.clientId}:${credentials.clientSecret}`);
    const refreshToken = await getUserData('refreshToken');
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credsB64}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `grant_type=refresh_token&refresh_token=${refreshToken}`,
    });
    const responseJson = await response.json();
    if (responseJson.error) {
      await getTokens();
    } else {
      const {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        expires_in: expiresIn,
      } = responseJson;

      const expirationTime = new Date().getTime() + expiresIn * 1000;
      await setUserData('accessToken', newAccessToken);
      if (newRefreshToken) {
        await setUserData('refreshToken', newRefreshToken);
      }
      await setUserData('expirationTime', expirationTime);
    }
  } catch (err) {
    console.error(err)
  }
}

export const getValidSPObj = async () => {
  const tokenExpirationTime = await getUserData('expirationTime');
  if (new Date().getTime() > tokenExpirationTime) {
    // access token has expired, so we need to use the refresh token
    await refreshTokens();
  }
  const accessToken = await getUserData('accessToken');
  var sp = new SpotifyWebAPI();
  await sp.setAccessToken(accessToken);
  return sp;
}

export default async function HelloWorldApp () {
  const sp = await getValidSPObj()
  
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Hello, Joe!</Text>
    </View>
  );
}
