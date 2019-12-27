import React, { Component } from 'react';
import { TouchableOpacity, StyleSheet, Text, View, Image } from 'react-native';
import { AuthSession } from 'expo';
import { FontAwesome } from '@expo/vector-icons';
import axios from 'axios';
import { encode as btoa } from 'base-64';
import SpotifyWebAPI from 'spotify-web-api-js';

const CLIENT_ID = 'cf1ba32e32674774a2de3e817f4dd5d1';
const CLIENT_SECRET = '3766d7bbb6cb434eb8200bb867a754e0';

const scopesArr = ['user-modify-playback-state','user-read-currently-playing','user-read-playback-state','user-library-modify',
                   'user-library-read','playlist-read-private','playlist-read-collaborative','playlist-modify-public',
                   'playlist-modify-private','user-read-recently-played','user-top-read', 'user-read-email'];
const scopes = scopesArr.join(' ');

export default class HelloWorldApp extends Component {
  state = {
    userInfo: null,
    didError: false,
    accessToken: null,
    refreshToken: null,
    expiresIn: null,
    playlists: null
  };

  getPlaylists = async () => {
    await this.setValidToken();
    let playlists = await axios.get(`https://api.spotify.com/v1/me/playlists?limit=1&offset=0`, {
      headers: {
        "Authorization": `Bearer ${this.state.accessToken}`
      }
    });
    
    //this.setState({playlists: playlists.items[0]})
  }

  getAuthResult = async () => {
    let redirectUrl = AuthSession.getRedirectUrl();
    let results = await AuthSession.startAsync({
      authUrl: `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUrl)}&scope=${encodeURIComponent(scopes)}&response_type=code`
    });

    return results.params.code;
  }

  setTokens = async(results) => {
    let redirectUrl = AuthSession.getRedirectUrl();
    const authorizationCode = await this.getAuthResult();
    const credsB64 = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credsB64}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `grant_type=authorization_code&code=${authorizationCode}&redirect_uri=${
        redirectUrl
      }`,
    });
  
    const responseJson = await response.json();
    const expirationTime = new Date().getTime() + responseJson.expiresIn * 1000;
    this.setState({accessToken: responseJson.accessToken})
    this.setState({refreshToken: responseJson.refreshToken})
    this.setState({expiresIn: expirationTime})
  };

  refreshTokens = async () => {
    try {
      const credsB64 = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
      const refreshToken = this.state.refreshToken;
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
        await this.setTokens();
      } else {
        this.setState({accessToken: responseJson.newAccessToken})
        if(newRefreshToken) {
          this.setState({refreshToken: responseJson.newRefreshToken})
        }
        const expirationTime = new Date().getTime() + responseJson.expiresIn * 1000;
        this.setState({expiresIn: expirationTime})
      }
    } catch (err) {
      console.error(err)
    }
  };  

  setValidToken = async () => {
    const tokenExpirationTime = this.state.expiresIn;
    if (new Date().getTime() > tokenExpirationTime) {
      // access token has expired, so we need to use the refresh token
      await this.refreshTokens();
    }
  }

  handleSpotifyLogin = async () => {
    await this.setTokens();
    await this.getPlaylists();
  };

  displayError = () => {
    return (
      <View style={styles.userInfo}>
        <Text style={styles.errorText}>
          There was an error, please try again.
        </Text>
      </View>
    );
  }

  displayResults = () => {
    { return this.state.playlists ? (
      <View style={styles.userInfo}>
        <View>
          
          <Text style={styles.userInfoText}>
            Playlists:
          </Text>
          <Text style={styles.userInfoText}>
            {this.state.playlists}
          </Text>
        </View>
      </View>
    ) : (
      <View style={styles.userInfo}>
        <Text style={styles.userInfoText}>
          Login to Spotify to see user data.
        </Text>
      </View>
    )}
  }

  render() {
    return (
      <View style={styles.container}>
        <FontAwesome
          name="spotify"
          color="#2FD566"
          size={128}
        />
        <TouchableOpacity
          style={styles.button}
          onPress={this.handleSpotifyLogin}
          disabled={this.state.playlists ? true : false}
        >
          <Text style={styles.buttonText}>
            Login with Spotify
          </Text>
        </TouchableOpacity>
        {this.state.didError ?
          this.displayError() :
          this.displayResults()
        }
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    backgroundColor: '#000',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  button: {
    backgroundColor: '#2FD566',
    padding: 20
  },
  buttonText: {
    color: '#000',
    fontSize: 20
  },
  userInfo: {
    height: 250,
    width: 200,
    alignItems: 'center',
  },
  userInfoText: {
    color: '#fff',
    fontSize: 18
  },
  errorText: {
    color: '#fff',
    fontSize: 18
  },
  profileImage: {
    height: 64,
    width: 64,
    marginBottom: 32
  }
});
