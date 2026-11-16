import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin, Search } from 'lucide-react-native';
import { auth, firestore } from '@/config/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useRegistration } from '@/context/RegistrationContext';
import RegistrationHeader from '@/components/RegistrationHeader';

type GeoapifySuggestion = {
  properties: {
    formatted: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
    lat: number;
    lon: number;
    place_id?: string;
  };
};

export default function ChooseLocation() {
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<GeoapifySuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const router = useRouter();
  const { updateOperation, totalSteps } = useRegistration();

  useEffect(() => {
    const query = search.trim();
    if (query.length < 3) {
      setSuggestions([]);
      setSearchError('');
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const apiKey = '8d0450d96b5748e89e46afaaf976f890';

      setIsSearching(true);
      setSearchError('');
      try {
        const response = await fetch(
          `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(query)}&filter=countrycode:zm&type=city&limit=8&apiKey=${apiKey}`,
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error(`Geoapify returned ${response.status}`);

        const data = await response.json();
        setSuggestions(Array.isArray(data.features) ? data.features : []);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        setSuggestions([]);
        setSearchError('Unable to search locations. Please try again.');
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search]);

  const handleSelect = async (item: GeoapifySuggestion) => {
    const p = item.properties;
    const cityName = p.city || p.county || p.state || p.formatted;
    const placeName = [cityName, p.state, p.country].filter(Boolean).join(', ');
    const uid = auth.currentUser?.uid;

    if (!uid) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    try {
      const driverRef = doc(firestore, 'drivers', uid);
      await updateDoc(driverRef, {
        place: placeName,
        location: { latitude: p.lat, longitude: p.lon },
        verificationStatus: 'pending',
        registrationCompleted: true,
        registrationStep: 7,
        updatedAt: serverTimestamp(),
      });

      updateOperation({ place: placeName, available: false });
      router.push('/application-submitted');
    } catch (error) {
      console.error('Error saving location:', error);
      Alert.alert('Error', 'Failed to save location. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <RegistrationHeader title="Choose Location" showHelp={false} />

      <View style={styles.content}>
        <Text style={styles.title}>Choose your location</Text>
        <Text style={styles.subtitle}>Search for the city or town you will be operating in.</Text>

        <View style={styles.searchContainer}>
          <Search color="#999" size={20} style={styles.searchIcon} />
          <TextInput
            style={styles.search}
            placeholder="e.g. Lusaka, Livingstone, Choma..."
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            returnKeyType="search"
          />
          {isSearching ? <ActivityIndicator color="#B19CD9" size="small" /> : null}
        </View>

        {searchError ? <Text style={styles.errorText}>{searchError}</Text> : null}

        <FlatList
          data={suggestions}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(item, index) => item.properties.place_id ?? `${item.properties.lat}-${item.properties.lon}-${index}`}
          renderItem={({ item }) => {
            const p = item.properties;
            const primaryName = p.city || p.county || p.state || p.formatted;
            const parts = [p.state, p.country].filter(Boolean);
            const secondaryName = parts.join(', ') || p.formatted;

            return (
              <TouchableOpacity onPress={() => handleSelect(item)} style={styles.item} accessibilityRole="button">
                <MapPin color="#B19CD9" size={20} />
                <View style={styles.itemText}>
                  <Text style={styles.city}>{primaryName}</Text>
                  <Text style={styles.region}>{secondaryName}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            search.trim().length >= 3 && !isSearching && !searchError ? (
              <Text style={styles.emptyText}>No matching locations found.</Text>
            ) : null
          }
          contentContainerStyle={styles.listContainer}
        />
      </View>

      <View style={styles.footer}>
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>7 of {totalSteps}</Text>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: '100%' }]} />
          </View>
        </View>

        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  subtitle: { color: '#aaa', fontSize: 15, lineHeight: 22, marginBottom: 20 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2a2a2a', marginBottom: 16, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  searchIcon: { marginRight: 8 },
  search: { flex: 1, color: '#fff', fontSize: 16 },
  errorText: { color: '#ff8a8a', fontSize: 14, marginBottom: 12 },
  listContainer: { paddingBottom: 20 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, borderBottomColor: '#333', borderBottomWidth: 1 },
  itemText: { flex: 1 },
  city: { color: '#fff', fontSize: 17, fontWeight: '500', marginBottom: 4 },
  region: { color: '#999', fontSize: 14, lineHeight: 20 },
  emptyText: { color: '#999', textAlign: 'center', paddingVertical: 28 },
  footer: { paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 30 : 20, paddingTop: 8, backgroundColor: '#1a1a1a' },
  progressContainer: { marginBottom: 16, alignItems: 'center' },
  progressText: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 12, textAlign: 'center' },
  progressBarBackground: { width: '100%', height: 6, backgroundColor: '#3a3a3a', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#B19CD9', borderRadius: 4 },
  backButton: { alignSelf: 'flex-start', backgroundColor: '#3a3a3a', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 24 },
  backButtonText: { fontSize: 18, fontWeight: '600', color: '#fff' },
});
