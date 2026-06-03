import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { WebView } from 'react-native-webview';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';

import { RootStackParamList } from '../types';
import { COLORS, SIZES } from '../constants';
import { globalStyles } from '../theme';
import { getAllSites, insertSite, deleteSite } from '../services/databaseService';

type ManageSitesScreenProps = NativeStackScreenProps<RootStackParamList, 'ManageSites'>;

const ManageSitesScreen: React.FC<ManageSitesScreenProps> = ({ navigation, route }) => {
  const adminUser = route?.params?.adminUser;
  
  const [sites, setSites] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Form states
  const [siteName, setSiteName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radius, setRadius] = useState('200'); // Default to 200m
  const [geofenceType, setGeofenceType] = useState<'circular' | 'square'>('circular');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const webViewRef = useRef<WebView>(null);

  // Native search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Verify admin access
  if (!adminUser || adminUser !== 'Priyanshu solanki') {
    return (
      <SafeAreaView style={[styles.container, globalStyles.container]}>
        <View style={styles.unauthorizedContainer}>
          <Text style={styles.unauthorizedIcon}>🔒</Text>
          <Text style={styles.unauthorizedTitle}>Access Denied</Text>
          <Text style={styles.unauthorizedText}>
            Only authorized administrators can configure geofence sites.
          </Text>
          <TouchableOpacity
            style={[styles.backBtn, { width: '80%', alignSelf: 'center' }]}
            onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  useFocusEffect(
    React.useCallback(() => {
      loadSites();
    }, [])
  );

  const performSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResults([]);
    
    try {
      let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(searchQuery)}&limit=10&countrycode=in`;
      
      // If we have center coordinates already, apply location bias
      if (latitude && longitude) {
        url += `&lat=${parseFloat(latitude)}&lon=${parseFloat(longitude)}&location_bias_scale=0.2`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP status ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.features) {
        const mappedResults = data.features.map((feature: any) => {
          const props = feature.properties || {};
          const name = props.name || props.street || '';
          
          // Construct details: "city, state, country"
          const detailsArray = [
            props.city || props.town || props.district,
            props.state,
            props.country,
          ].filter(Boolean);
          
          const details = detailsArray.join(', ');
          const displayName = name 
            ? (details ? `${name}, ${details}` : name)
            : details || 'Unknown Location';
            
          const lon = feature.geometry.coordinates[0];
          const lat = feature.geometry.coordinates[1];
          
          return {
            display_name: displayName,
            lat: lat.toString(),
            lon: lon.toString(),
          };
        });
        
        setSearchResults(mappedResults);
        if (mappedResults.length === 0) {
          Alert.alert('Location Not Found', 'No matches found in India for your search query. Try typing a highway, landmark, or city name (e.g. Dwarka Expressway).');
        }
      } else {
        setSearchResults([]);
        Alert.alert('Location Not Found', 'No matches found in India for your search query.');
      }
    } catch (err: any) {
      console.error('Search error:', err);
      Alert.alert('Search Error', `Search failed: ${err.message || err}. Tap directly on the map if search is unavailable.`);
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchResult = (item: any) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    
    setLatitude(lat.toFixed(6));
    setLongitude(lon.toFixed(6));
    
    setSearchResults([]);
    setSearchQuery(item.display_name);

    if (webViewRef.current) {
      webViewRef.current.postMessage(
        JSON.stringify({
          type: 'PAN_TO',
          latitude: lat,
          longitude: lon,
        })
      );
      
      // Inject JS directly to ensure immediate pan/marker updates on Android
      webViewRef.current.injectJavaScript(`
        if (typeof updateMarker === 'function' && typeof map !== 'undefined') {
          updateMarker(${lat}, ${lon});
          map.setView([${lat}, ${lon}], 15);
        }
        true;
      `);
    }
  };

  const loadSites = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getAllSites();
      setSites(data);
    } catch (err) {
      console.error('Error loading sites:', err);
      setError('Failed to load sites from local database');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMapMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'SELECT_COORDS' || data.type === 'LOCATION_FOUND') {
        setLatitude(data.latitude.toFixed(6));
        setLongitude(data.longitude.toFixed(6));
      } else if (data.type === 'WEB_LOG') {
        console.log('[WebView Log]', data.message);
      } else if (data.type === 'SEARCH_RESULTS') {
        setSearchResults(data.results || []);
        setIsSearching(false);
        if (!data.results || data.results.length === 0) {
          Alert.alert('Location Not Found', 'No matches found in India for your search query. Try typing a city or highway name (e.g. Dwarka Expressway).');
        }
      } else if (data.type === 'SEARCH_ERROR') {
        setIsSearching(false);
        Alert.alert('Search Error', `Search failed: ${data.error || 'Unknown Error'}. Tap directly on the map if search is unavailable.`);
      }
    } catch (e) {
      console.log('Error parsing map message:', e);
    }
  };

  const handleRadiusChange = (text: string) => {
    setRadius(text);
    const radiusNum = Number(text);
    if (!isNaN(radiusNum) && radiusNum > 0 && webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'UPDATE_RADIUS',
        radius: radiusNum,
      }));
      webViewRef.current.injectJavaScript(`
        if (typeof currentRadius !== 'undefined') {
          currentRadius = ${radiusNum};
          if (marker) {
            drawGeofence(marker.getLatLng());
          }
        }
        true;
      `);
    }
  };

  const handleShapeChange = (shape: 'circular' | 'square') => {
    setGeofenceType(shape);
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'UPDATE_SHAPE',
        shape: shape,
      }));
      webViewRef.current.injectJavaScript(`
        if (typeof currentShape !== 'undefined') {
          currentShape = '${shape}';
          if (marker) {
            drawGeofence(marker.getLatLng());
          }
        }
        true;
      `);
    }
  };

  const handleAddSite = async () => {
    setError('');

    // Validation
    if (!siteName.trim()) {
      setError('Site Name is required (e.g. Meerut Highway Project)');
      return;
    }
    if (!latitude || !longitude || isNaN(Number(latitude)) || isNaN(Number(longitude))) {
      setError('Please tap a location on the map or search to capture coordinates');
      return;
    }
    if (!radius.trim() || isNaN(Number(radius)) || Number(radius) <= 0) {
      setError('Radius must be a positive number in meters');
      return;
    }

    setIsSubmitting(true);
    try {
      // Auto-generate unique Site ID
      const nameAbbr = siteName
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 15);
      const uniqueSuffix = Date.now().toString().slice(-4);
      const autoSiteId = `SITE_${nameAbbr}_${uniqueSuffix}`;

      const newSite = {
        siteId: autoSiteId,
        siteName: siteName.trim(),
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radius: Number(radius),
        geofenceType: geofenceType,
      };

      const result = await insertSite(newSite);
      if (result.success) {
        Alert.alert('Success', `Site "${newSite.siteName}" registered successfully.`);
        // Reset form
        setSiteName('');
        setLatitude('');
        setLongitude('');
        setRadius('200');
        setGeofenceType('circular');
        // Reset map webview graphics
        if (webViewRef.current) {
          webViewRef.current.postMessage(JSON.stringify({
            type: 'RESET_MAP',
          }));
          webViewRef.current.injectJavaScript(`
            if (typeof geofenceShape !== 'undefined' && geofenceShape) {
              map.removeLayer(geofenceShape);
              geofenceShape = null;
            }
            if (typeof marker !== 'undefined' && marker) {
              map.removeLayer(marker);
              marker = null;
            }
            true;
          `);
        }
        await loadSites();
      } else {
        const errorMsg = (result.error as any)?.message || JSON.stringify(result.error) || 'Unknown Database Error';
        setError(`Failed to save site in database: ${errorMsg}`);
      }
    } catch (err: any) {
      console.error('Error adding site:', err);
      setError(`Error saving site: ${err?.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSite = (id: string, name: string) => {
    Alert.alert(
      'Delete Site',
      `Are you sure you want to delete ${name} (${id})?\n\nThis will remove the geofence boundary associated with this site.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteSite(id);
              if (result.success) {
                Alert.alert('Deleted', `${name} deleted successfully.`);
                loadSites();
              } else {
                Alert.alert('Error', 'Failed to delete site.');
              }
            } catch (err) {
              console.error('Error deleting site:', err);
              Alert.alert('Error', 'An error occurred while deleting the site.');
            }
          },
        },
      ]
    );
  };

  const renderSiteCard = ({ item }: { item: any }) => (
    <View style={styles.siteCard}>
      <View style={styles.siteInfo}>
        <Text style={styles.siteTitle}>{item.site_name}</Text>
        <View style={styles.badgeRow}>
          <View style={styles.idBadge}>
            <Text style={styles.idBadgeText}>{item.site_id}</Text>
          </View>
          <View style={[styles.idBadge, { backgroundColor: item.geofence_type === 'square' ? '#fff3e0' : '#e8f5e9' }]}>
            <Text style={[styles.idBadgeText, { color: item.geofence_type === 'square' ? '#e65100' : '#2e7d32' }]}>
              {item.geofence_type === 'square' ? 'Square' : 'Circular'}: {item.radius}m
            </Text>
          </View>
        </View>
        <Text style={styles.coordsText}>
          📍 Lat: {item.latitude.toFixed(6)}, Lon: {item.longitude.toFixed(6)}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => handleDeleteSite(item.site_id, item.site_name)}>
        <Text style={styles.deleteIcon}>🗑</Text>
      </TouchableOpacity>
    </View>
  );

  const leafletHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
      <style>
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
        #map { height: 100vh; width: 100vw; }
        #status-indicator {
          position: absolute;
          bottom: 25px;
          left: 10px;
          z-index: 1000;
          background: rgba(26, 84, 144, 0.95);
          color: white;
          padding: 6px 12px;
          font-size: 11px;
          font-weight: 600;
          border-radius: 6px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        #locate-btn {
          position: absolute;
          bottom: 25px;
          right: 10px;
          z-index: 1000;
          background: white;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
          border: 1px solid #ccc;
          cursor: pointer;
          font-size: 20px;
        }
        #locate-btn:active {
          background: #eee;
        }
      </style>
    </head>
    <body>
      <div id="locate-btn" onclick="locateDevice()">🎯</div>
      <div id="status-indicator">Tap map to select center point</div>
      <div id="map"></div>
      <script>
        var defaultLat = 28.5702;
        var defaultLng = 77.2241;
        var currentRadius = 200;
        var currentShape = 'circular';
        
        var map = L.map('map', {
          zoomControl: false
        }).setView([defaultLat, defaultLng], 12);
        
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 18,
          attribution: '© OpenStreetMap'
        }).addTo(map);

        var marker;
        var geofenceShape;

        function updateMarker(lat, lng) {
          var latlng = L.latLng(lat, lng);
          if (marker) {
            marker.setLatLng(latlng);
          } else {
            marker = L.marker(latlng).addTo(map);
          }
          
          drawGeofence(latlng);
          map.panTo(latlng);
        }

        function drawGeofence(latlng) {
          if (geofenceShape) {
            map.removeLayer(geofenceShape);
            geofenceShape = null;
          }
          
          if (currentShape === 'circular') {
            geofenceShape = L.circle(latlng, {
              color: '#1a5490',
              fillColor: '#30a1ff',
              fillOpacity: 0.25,
              radius: currentRadius
            }).addTo(map);
          } else {
            const metersPerDegreeLat = 111111;
            const metersPerDegreeLon = 111111 * Math.cos(latlng.lat * Math.PI / 180);
            
            const latDelta = currentRadius / metersPerDegreeLat;
            const lonDelta = currentRadius / metersPerDegreeLon;
            
            var bounds = [
              [latlng.lat - latDelta, latlng.lng - lonDelta],
              [latlng.lat + latDelta, latlng.lng + lonDelta]
            ];
            
            geofenceShape = L.rectangle(bounds, {
              color: '#ff9800',
              fillColor: '#ffa726',
              fillOpacity: 0.25
            }).addTo(map);
          }
        }

        map.on('click', function(e) {
          var lat = e.latlng.lat;
          var lng = e.latlng.lng;
          updateMarker(lat, lng);
          sendCoords(lat, lng);
        });

        function sendCoords(lat, lng) {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'SELECT_COORDS',
              latitude: lat,
              longitude: lng
            }));
          }
        }

        function locateDevice() {
          map.locate({setView: true, maxZoom: 15});
        }

        locateDevice();
        
        map.on('locationfound', function(e) {
          updateMarker(e.latlng.lat, e.latlng.lng);
          sendCoords(e.latlng.lat, e.latlng.lng);
        });

        function logToRN(msg) {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'WEB_LOG',
              message: msg
            }));
          }
        }

        function handleMessage(event) {
          try {
            var data = JSON.parse(event.data);
            logToRN('Message received in WebView: ' + data.type);
            if (data.type === 'UPDATE_RADIUS') {
              currentRadius = data.radius || 200;
              if (marker) {
                drawGeofence(marker.getLatLng());
              }
            } else if (data.type === 'UPDATE_SHAPE') {
              currentShape = data.shape || 'circular';
              if (marker) {
                drawGeofence(marker.getLatLng());
              }
            } else if (data.type === 'RESET_MAP') {
              if (geofenceShape) {
                map.removeLayer(geofenceShape);
                geofenceShape = null;
              }
              if (marker) {
                map.removeLayer(marker);
                marker = null;
              }
            } else if (data.type === 'PAN_TO') {
              var lat = parseFloat(data.latitude);
              var lng = parseFloat(data.longitude);
              logToRN('Panning map to lat: ' + lat + ', lng: ' + lng);
              updateMarker(lat, lng);
              map.setView([lat, lng], 15);
            }
          } catch(e) {
            logToRN('Error handling message in WebView: ' + e.message);
          }
        }
        window.addEventListener('message', handleMessage);
        document.addEventListener('message', handleMessage);
      </script>
    </body>
    </html>
  `;

  return (
    <SafeAreaView style={[styles.container, globalStyles.container]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>Configure Geofence Sites</Text>
          <Text style={styles.headerSubtitle}>
            Define project boundaries. Choose circular or square zones and search/tap the map.
          </Text>
        </View>

        {/* Create Site Form */}
        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Create New Boundary</Text>

          {/* Geofence Shape Selector */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Geofence Shape</Text>
            <View style={styles.shapeToggleContainer}>
              <TouchableOpacity
                style={[
                  styles.shapeToggleButton,
                  geofenceType === 'circular' && styles.shapeToggleActiveCircular,
                ]}
                onPress={() => handleShapeChange('circular')}>
                <Text
                  style={[
                    styles.shapeToggleText,
                    geofenceType === 'circular' && styles.shapeToggleTextActive,
                  ]}>
                  🔵 Circular Geofence
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.shapeToggleButton,
                  geofenceType === 'square' && styles.shapeToggleActiveSquare,
                ]}
                onPress={() => handleShapeChange('square')}>
                <Text
                  style={[
                    styles.shapeToggleText,
                    geofenceType === 'square' && styles.shapeToggleTextActive,
                  ]}>
                  🟧 Square Geofence
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Native Location Search Input */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Search Highway/Landmark</Text>
            <View style={styles.searchBarRow}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search expressway, highway, toll, city (e.g. Dwarka)..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={COLORS.textTertiary}
                onSubmitEditing={performSearch}
              />
              <TouchableOpacity
                style={styles.searchBtn}
                onPress={performSearch}
                disabled={isSearching}>
                {isSearching ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.searchBtnText}>Search</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Search suggestions dropdown (absolute positioned overlay) */}
          {searchResults.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <View style={styles.suggestionsHeader}>
                <Text style={styles.suggestionsTitle}>Search Results ({searchResults.length})</Text>
                <TouchableOpacity onPress={() => setSearchResults([])}>
                  <Text style={styles.closeSuggestionsText}>✕ Close</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.suggestionsScrollView} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
                {searchResults.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionItem}
                    onPress={() => selectSearchResult(item)}>
                    <Text style={styles.suggestionPin}>📍</Text>
                    <View style={styles.suggestionTextContainer}>
                      <Text style={styles.suggestionName} numberOfLines={1}>
                        {item.display_name.split(',')[0]}
                      </Text>
                      <Text style={styles.suggestionDetails} numberOfLines={2}>
                        {item.display_name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Interactive OpenStreetMap WebView */}
          <Text style={styles.label}>Center Coordinates & Pin Placement</Text>
          <Text style={styles.mapInstructionText}>
            Tap anywhere on the map below or search above to adjust the boundary center.
          </Text>
          <View style={styles.mapContainer}>
            <WebView
              ref={webViewRef}
              source={{ html: leafletHtml }}
              onMessage={handleMapMessage}
              style={styles.mapWebView}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              geolocationEnabled={true}
              mixedContentMode="always"
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Site Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Meerut Highway Project"
              value={siteName}
              onChangeText={setSiteName}
              placeholderTextColor={COLORS.textTertiary}
            />
          </View>

          <View style={styles.fieldRow}>
            <View style={[styles.fieldContainer, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>
                {geofenceType === 'square' ? 'Half-Side Side (m)' : 'Radius (meters)'}
              </Text>
              <TextInput
                style={styles.input}
                placeholder="200"
                value={radius}
                onChangeText={handleRadiusChange}
                keyboardType="numeric"
                placeholderTextColor={COLORS.textTertiary}
              />
            </View>
            <View style={[styles.fieldContainer, { flex: 1 }]}>
              <Text style={styles.label}>Coordinates (Tapped)</Text>
              <View style={styles.coordDisplayBox}>
                <Text style={styles.coordDisplayText} numberOfLines={1}>
                  {latitude && longitude ? `${latitude}, ${longitude}` : 'Tap map to drop pin'}
                </Text>
              </View>
            </View>
          </View>

          {error ? <Text style={styles.errorText}>⚠️ {error}</Text> : null}

          <TouchableOpacity
            style={[styles.addBtn, isSubmitting && styles.addBtnDisabled]}
            onPress={handleAddSite}
            disabled={isSubmitting}>
            {isSubmitting ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.addBtnText}>Save Geofence Site</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Existing Sites List */}
        <View style={styles.listContainer}>
          <Text style={styles.sectionTitle}>Configured Highway Sites</Text>

          {isLoading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 24 }} />
          ) : sites.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No project sites configured.</Text>
            </View>
          ) : (
            <FlatList
              data={sites}
              renderItem={renderSiteCard}
              keyExtractor={item => item.site_id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            />
          )}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footerControls}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.lg,
  },
  headerSection: {
    marginBottom: SIZES.xl,
  },
  headerTitle: {
    fontSize: SIZES['2xl'],
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SIZES.xs,
  },
  headerSubtitle: {
    fontSize: SIZES.base - 1,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  formContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: SIZES.lg,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: SIZES.lg,
    marginBottom: SIZES.xl,
  },
  sectionTitle: {
    fontSize: SIZES.base + 2,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SIZES.md,
  },
  mapContainer: {
    height: 320,
    borderRadius: SIZES.base,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SIZES.lg,
  },
  mapWebView: {
    flex: 1,
  },
  shapeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.gray100,
    borderRadius: SIZES.base,
    padding: 4,
  },
  shapeToggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: SIZES.base - 2,
    alignItems: 'center',
  },
  shapeToggleActiveCircular: {
    backgroundColor: '#e3f2fd',
    elevation: 1,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  shapeToggleActiveSquare: {
    backgroundColor: '#fff3e0',
    elevation: 1,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  shapeToggleText: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  shapeToggleTextActive: {
    color: COLORS.text,
    fontWeight: '700',
  },
  fieldContainer: {
    marginBottom: SIZES.md,
  },
  fieldRow: {
    flexDirection: 'row',
  },
  label: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SIZES.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.base,
    paddingHorizontal: SIZES.md,
    paddingVertical: 8,
    fontSize: SIZES.base,
    color: COLORS.text,
    backgroundColor: COLORS.white,
  },
  coordDisplayBox: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.base,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: SIZES.md,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  coordDisplayText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  errorText: {
    color: COLORS.error,
    fontSize: SIZES.sm,
    fontWeight: '500',
    marginBottom: SIZES.md,
  },
  addBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.buttonRadius,
    paddingVertical: SIZES.md,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: SIZES.buttonHeight,
    marginTop: SIZES.xs,
  },
  addBtnDisabled: {
    opacity: 0.6,
  },
  addBtnText: {
    color: COLORS.white,
    fontSize: SIZES.base,
    fontWeight: '700',
  },
  listContainer: {
    marginBottom: SIZES.xl,
  },
  siteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.lg,
    padding: SIZES.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 1,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  siteInfo: {
    flex: 1,
  },
  siteTitle: {
    fontSize: SIZES.base,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SIZES.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: SIZES.xs,
  },
  idBadge: {
    backgroundColor: '#e3f2fd',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  idBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
  },
  coordsText: {
    fontSize: SIZES.sm - 1,
    color: COLORS.textSecondary,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffe6e6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SIZES.md,
  },
  deleteIcon: {
    fontSize: 16,
  },
  emptyBox: {
    backgroundColor: COLORS.gray100,
    borderRadius: SIZES.lg,
    paddingVertical: SIZES.xl,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.gray400,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.base,
  },
  footerControls: {
    paddingHorizontal: SIZES.lg,
    paddingBottom: SIZES.xl,
  },
  backBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: SIZES.buttonRadius,
    paddingVertical: SIZES.md,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: SIZES.buttonHeight,
  },
  backBtnText: {
    color: COLORS.primary,
    fontSize: SIZES.base,
    fontWeight: '600',
  },
  unauthorizedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SIZES.xl,
  },
  unauthorizedIcon: {
    fontSize: 64,
    marginBottom: SIZES.lg,
  },
  unauthorizedTitle: {
    fontSize: SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SIZES.md,
    textAlign: 'center',
  },
  unauthorizedText: {
    fontSize: SIZES.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SIZES.xl,
    lineHeight: 22,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.base,
    paddingHorizontal: SIZES.md,
    paddingVertical: 10,
    fontSize: SIZES.base - 1,
    color: COLORS.text,
    backgroundColor: COLORS.white,
  },
  searchBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.base,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  searchBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: SIZES.sm,
  },
  suggestionsContainer: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.base,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: 220,
    zIndex: 99,
    elevation: 99,
    marginTop: 4,
    marginBottom: SIZES.md,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: SIZES.base,
    borderTopRightRadius: SIZES.base,
  },
  suggestionsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  closeSuggestionsText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.error,
  },
  suggestionsScrollView: {
    maxHeight: 180,
  },
  suggestionItem: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    alignItems: 'center',
  },
  suggestionPin: {
    fontSize: 14,
    marginRight: 10,
  },
  suggestionTextContainer: {
    flex: 1,
  },
  suggestionName: {
    fontSize: SIZES.sm,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  suggestionDetails: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  mapInstructionText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 6,
    fontStyle: 'italic',
  },
});

export default ManageSitesScreen;
