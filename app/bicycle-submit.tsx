import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft, AlertCircle } from 'lucide-react-native';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, firestore } from '@/config/firebase';
import { useRegistration } from '@/context/RegistrationContext';
import { uploadCyclistImageToCloudinary } from '@/utils/cloudinary';

async function uriToBase64(uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.readAsDataURL(blob);
  });
}

export default function BicycleSubmitPage() {
  const { registrationData, updateBicycle, setCurrentStep, totalSteps } = useRegistration();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const bicycle = registrationData.bicycle;

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setErrorMessage(null);

    const uid = auth.currentUser?.uid || registrationData.uid;
    if (!uid) {
      setErrorMessage('Your session has expired. Please sign in and try again.');
      return;
    }
    if (!bicycle.bicyclePhoto || !bicycle.selfieWithBicycle || !bicycle.color || !bicycle.frameType) {
      setErrorMessage('Please complete all bicycle details before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Convert URIs to base64 before uploading — uploadCyclistImageToCloudinary expects base64
      const [bicyclePhotoBase64, selfieBase64] = await Promise.all([
        uriToBase64(bicycle.bicyclePhoto),
        uriToBase64(bicycle.selfieWithBicycle),
      ]);

      const [bicyclePhotoUrl, selfieWithBicycleUrl] = await Promise.all([
        uploadCyclistImageToCloudinary(bicyclePhotoBase64),
        uploadCyclistImageToCloudinary(selfieBase64),
      ]);

      const bicycleData = {
        bicyclePhoto: bicyclePhotoUrl,
        selfieWithBicycle: selfieWithBicycleUrl,
        color: bicycle.color,
        hasCourierBag: bicycle.hasCourierBag,
        frameType: bicycle.frameType,
        services: ['delivery', 'courier'],
      };

      await updateDoc(doc(firestore, 'drivers', uid), {
        bicycle: bicycleData,
        'vehicle.type': 'bicycle',
        'vehicle.vehicleCategory': 'bicycle',
        'vehicle.color': bicycle.color,
        'vehicle.carImage': bicyclePhotoUrl,
        'vehicle.services': bicycleData.services,
        registrationStep: 6,
        updatedAt: serverTimestamp(),
      });

      updateBicycle({ bicyclePhoto: bicyclePhotoUrl, selfieWithBicycle: selfieWithBicycleUrl });
      setCurrentStep(6);
      router.replace('/chooseLocation');
    } catch (error) {
      console.error('Error submitting bicycle details:', error);
      setErrorMessage('Could not save your bicycle details. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back" disabled={isSubmitting}>
          <ChevronLeft color="#FFFFFF" size={32} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Submit</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Almost done!</Text>
        <Text style={styles.subtitle}>Review and submit your bicycle details.</Text>

        {errorMessage && (
          <View style={styles.errorBanner}>
            <AlertCircle color="#FF6B6B" size={18} style={styles.errorIcon} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        <View style={styles.summaryCard}>
          <Image source={{ uri: bicycle.bicyclePhoto }} style={styles.bicycleImage} />
          <View style={styles.summaryDetails}>
            <Text style={styles.summaryText}>Color: {bicycle.color}</Text>
            <Text style={styles.summaryText}>Frame: {bicycle.frameType}</Text>
            <Text style={styles.summaryText}>Courier bag: {bicycle.hasCourierBag ? 'Yes' : 'No'}</Text>
          </View>
        </View>

        <View style={styles.serviceCard}>
          <Text style={styles.serviceText}>Services: Delivery & Courier (auto-assigned)</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.progressLabels}>
          <Text style={styles.progressText}>6 of {totalSteps}</Text>
          <Text style={styles.progressText}>{Math.round((6 / totalSteps) * 100)}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${(6 / totalSteps) * 100}%` }]} />
        </View>
        <View style={styles.footerButtons}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} disabled={isSubmitting}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? <><ActivityIndicator color="#FFFFFF" /><Text style={styles.submitButtonText}>Submitting...</Text></>
              : <Text style={styles.submitButtonText}>Submit</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#16171B' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 32,
    paddingHorizontal: 24,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { color: '#FFFFFF', fontSize: 26, fontWeight: '700' },
  headerSpacer: { width: 32 },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 40, gap: 22 },
  title: { color: '#FFFFFF', fontSize: 38, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: '#B9B8C0', fontSize: 20, lineHeight: 28, textAlign: 'center', marginTop: -8 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,107,107,0.12)',
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B6B',
    borderRadius: 8,
    padding: 14,
    gap: 10,
  },
  errorIcon: { marginTop: 1 },
  errorText: { flex: 1, color: '#FF6B6B', fontSize: 14, lineHeight: 20 },
  summaryCard: {
    backgroundColor: '#252832',
    borderRadius: 14,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  bicycleImage: { width: 120, height: 120, borderRadius: 10, backgroundColor: '#393A40' },
  summaryDetails: { flex: 1, gap: 14 },
  summaryText: { color: '#FFFFFF', fontSize: 18, lineHeight: 24 },
  serviceCard: { backgroundColor: '#2D244B', borderRadius: 10, padding: 18 },
  serviceText: { color: '#C7AFFF', fontSize: 17, lineHeight: 24, textAlign: 'center' },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#303137',
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 22,
    gap: 14,
  },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progressText: { color: '#E8E7ED', fontSize: 16 },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: '#484850', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#7C4DFF', borderRadius: 4 },
  footerButtons: { flexDirection: 'row', gap: 14 },
  backButton: {
    backgroundColor: '#393A40',
    paddingVertical: 17,
    paddingHorizontal: 28,
    borderRadius: 10,
    alignItems: 'center',
  },
  backButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  submitButton: {
    flex: 1,
    backgroundColor: '#7C4DFF',
    paddingVertical: 17,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  submitButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  disabledButton: { opacity: 0.55 },
});
