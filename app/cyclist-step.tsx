import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Camera, ChevronDown, ChevronLeft, ImageIcon, X } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import colors from '@/assets/colors.json';
import { useRegistration } from '@/context/RegistrationContext';

type PhotoType = 'bicyclePhoto' | 'selfieWithBicycle';
type ScreenMode = 'details' | 'camera' | 'preview';

const frameTypes = ['Mountain', 'Road', 'Hybrid', 'BMX', 'Cargo', 'Electric', 'Other'];

export default function CyclistStepPage() {
  const { registrationData, updateBicycle, setCurrentStep, totalSteps } = useRegistration();
  const [page, setPage] = useState<1 | 2>(1);
  const [mode, setMode] = useState<ScreenMode>('details');
  const [photoType, setPhotoType] = useState<PhotoType>('bicyclePhoto');
  const [capturedImage, setCapturedImage] = useState('');
  const [cameraRef, setCameraRef] = useState<CameraView | null>(null);
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFramePicker, setShowFramePicker] = useState(false);
  const [isOpeningPicker, setIsOpeningPicker] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const bicycle = registrationData.bicycle;
  const currentPhoto = photoType === 'bicyclePhoto' ? bicycle.bicyclePhoto : bicycle.selfieWithBicycle;
  const canContinue = page === 1
    ? Boolean(bicycle.bicyclePhoto && bicycle.color)
    : Boolean(bicycle.selfieWithBicycle && bicycle.frameType);

  const beginPhoto = (type: PhotoType) => {
    setPhotoType(type);
    setShowSourcePicker(true);
  };

  const openCamera = async () => {
    setShowSourcePicker(false);
    const permission = cameraPermission?.granted
      ? cameraPermission
      : await requestCameraPermission();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Camera access is needed to take this picture.');
      return;
    }
    setMode('camera');
  };

  const openGallery = async () => {
    setIsOpeningPicker(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission required', 'Photo library access is needed to select a picture.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.9,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        setCapturedImage(result.assets[0].uri);
        setShowSourcePicker(false);
        setMode('preview');
      }
    } catch {
      Alert.alert('Unable to open photos', 'Please try again.');
    } finally {
      setIsOpeningPicker(false);
    }
  };

  const takePicture = async () => {
    try {
      const photo = await cameraRef?.takePictureAsync({ quality: 0.9 });
      if (photo?.uri) {
        setCapturedImage(photo.uri);
        setMode('preview');
      }
    } catch {
      Alert.alert('Unable to take picture', 'Please try again.');
    }
  };

  const savePreview = () => {
    if (!capturedImage) return;
    updateBicycle({ [photoType]: capturedImage });
    setCapturedImage('');
    setMode('details');
  };

  const handleBack = () => {
    if (mode !== 'details') {
      setCapturedImage('');
      setMode('details');
      return;
    }
    if (page === 2) {
      setPage(1);
      setCurrentStep(4);
      return;
    }
    router.back();
  };

  const handleNext = () => {
    if (!canContinue) return;
    if (page === 1) {
      setPage(2);
      setCurrentStep(5);
      return;
    }
    router.push('/bicycle-submit');
  };

  if (mode === 'camera') {
    return (
      <View style={styles.container}>
        <CameraView style={styles.camera} ref={setCameraRef} facing={photoType === 'selfieWithBicycle' ? 'front' : 'back'}>
          <TouchableOpacity style={styles.cameraClose} onPress={handleBack} accessibilityLabel="Close camera">
            <X color="#FFFFFF" size={28} />
          </TouchableOpacity>
          <View style={styles.cameraFooter}>
            <TouchableOpacity style={styles.captureButton} onPress={takePicture} accessibilityLabel="Take picture">
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    );
  }

  if (mode === 'preview' && capturedImage) {
    return (
      <View style={styles.container}>
        <Header title="Preview" onBack={handleBack} />
        <Image source={{ uri: capturedImage }} style={styles.previewImage} resizeMode="contain" />
        <View style={styles.previewActions}>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setMode('camera')}>
            <Text style={styles.secondaryButtonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={savePreview}>
            <Text style={styles.primaryButtonText}>Use photo</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Bicycle Details" onBack={handleBack} showHelp />
      <ScrollView contentContainerStyle={styles.content}>
        <PhotoField
          imageUri={page === 1 ? bicycle.bicyclePhoto : bicycle.selfieWithBicycle}
          label={page === 1 ? 'Bicycle photo' : 'Selfie with bicycle'}
          onPress={() => beginPhoto(page === 1 ? 'bicyclePhoto' : 'selfieWithBicycle')}
        />

        {page === 1 ? (
          <>
            <TouchableOpacity style={styles.field} onPress={() => setShowColorPicker(true)}>
              <Text style={styles.fieldLabel}>Bike color</Text>
              <View style={styles.fieldValueRow}>
                {bicycle.color ? <View style={[styles.colorDot, { backgroundColor: colors.find((item) => item.name === bicycle.color)?.hex }]} /> : null}
                <Text style={bicycle.color ? styles.fieldValue : styles.placeholder}>{bicycle.color || 'Select color'}</Text>
                <ChevronDown color="#D5D4DB" size={22} />
              </View>
            </TouchableOpacity>
            <View style={styles.switchField}>
              <Text style={styles.switchLabel}>Do you have a courier bag?</Text>
              <Switch
                value={bicycle.hasCourierBag}
                onValueChange={(value) => updateBicycle({ hasCourierBag: value })}
                trackColor={{ false: '#55545B', true: '#7C4DFF' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </>
        ) : (
          <TouchableOpacity style={styles.field} onPress={() => setShowFramePicker(true)}>
            <Text style={styles.fieldLabel}>Frame type</Text>
            <View style={styles.fieldValueRow}>
              <Text style={bicycle.frameType ? styles.fieldValue : styles.placeholder}>{bicycle.frameType || 'Select frame type'}</Text>
              <ChevronDown color="#D5D4DB" size={22} />
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.progressText}>{page === 1 ? 4 : 5} of {totalSteps}</Text>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${((page === 1 ? 4 : 5) / totalSteps) * 100}%` }]} /></View>
        <View style={styles.footerButtons}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}><Text style={styles.backButtonText}>Back</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.nextButton, !canContinue && styles.disabledButton]} onPress={handleNext} disabled={!canContinue}>
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={showSourcePicker} animationType="slide" transparent onRequestClose={() => setShowSourcePicker(false)}>
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}><Text style={styles.sheetTitle}>{photoType === 'bicyclePhoto' ? 'Bicycle photo' : 'Selfie with bicycle'}</Text><TouchableOpacity onPress={() => setShowSourcePicker(false)}><X color="#FFFFFF" size={26} /></TouchableOpacity></View>
            <Text style={styles.sheetDescription}>{photoType === 'bicyclePhoto' ? 'Show the full bicycle clearly in good lighting.' : 'Make sure both you and the bicycle are clearly visible.'}</Text>
            <TouchableOpacity style={styles.sourceButton} onPress={openCamera}><Camera color="#FFFFFF" size={22} /><Text style={styles.sourceButtonText}>Take a new picture</Text></TouchableOpacity>
            <TouchableOpacity style={styles.sourceButton} onPress={openGallery} disabled={isOpeningPicker}><ImageIcon color="#FFFFFF" size={22} />{isOpeningPicker ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.sourceButtonText}>Choose from gallery</Text>}</TouchableOpacity>
          </View>
        </View>
      </Modal>

      <SelectionModal visible={showColorPicker} title="Bike color" items={colors.map((item) => item.name)} onClose={() => setShowColorPicker(false)} onSelect={(color) => { updateBicycle({ color }); setShowColorPicker(false); }} />
      <SelectionModal visible={showFramePicker} title="Frame type" items={frameTypes} onClose={() => setShowFramePicker(false)} onSelect={(frameType) => { updateBicycle({ frameType }); setShowFramePicker(false); }} />
    </View>
  );
}

function Header({ title, onBack, showHelp = false }: { title: string; onBack: () => void; showHelp?: boolean }) {
  return <View style={styles.header}><TouchableOpacity onPress={onBack} accessibilityLabel="Go back"><ChevronLeft color="#FFFFFF" size={32} /></TouchableOpacity><Text style={styles.headerTitle}>{title}</Text>{showHelp ? <TouchableOpacity><Text style={styles.helpText}>Help</Text></TouchableOpacity> : <View style={styles.headerSpacer} />}</View>;
}

function PhotoField({ imageUri, label, onPress }: { imageUri: string; label: string; onPress: () => void }) {
  return <TouchableOpacity style={styles.photoArea} onPress={onPress} accessibilityLabel={`Add ${label.toLowerCase()}`}><View style={styles.photoBox}>{imageUri ? <Image source={{ uri: imageUri }} style={styles.photo} /> : <><Camera color="#FFFFFF" size={52} /><Text style={styles.addPhotoText}>Add photo</Text></>}</View><Text style={styles.photoLabel}>{label}</Text></TouchableOpacity>;
}

function SelectionModal({ visible, title, items, onClose, onSelect }: { visible: boolean; title: string; items: string[]; onClose: () => void; onSelect: (item: string) => void }) {
  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}><View style={styles.modalContainer}><View style={styles.sheetHeader}><Text style={styles.sheetTitle}>{title}</Text><TouchableOpacity onPress={onClose}><X color="#FFFFFF" size={26} /></TouchableOpacity></View><FlatList data={items} keyExtractor={(item) => item} renderItem={({ item }) => <TouchableOpacity style={styles.option} onPress={() => onSelect(item)}><Text style={styles.optionText}>{item}</Text></TouchableOpacity>} /></View></Modal>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#16171B' },
  header: { paddingTop: Platform.OS === 'ios' ? 56 : 32, paddingHorizontal: 24, paddingBottom: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: '#FFFFFF', fontSize: 27, fontWeight: '700' },
  headerSpacer: { width: 32 }, helpText: { color: '#FFFFFF', fontSize: 17 },
  content: { paddingHorizontal: 28, paddingBottom: 24, gap: 20 },
  photoArea: { alignItems: 'center', gap: 12 },
  photoBox: { width: '78%', maxWidth: 440, height: 320, borderWidth: 3, borderStyle: 'dashed', borderColor: '#9B5CFF', borderRadius: 8, alignItems: 'center', justifyContent: 'center', gap: 10, overflow: 'hidden' },
  photo: { width: '100%', height: '100%' }, addPhotoText: { color: '#D5D4DB', fontSize: 16 }, photoLabel: { color: '#D5D4DB', fontSize: 22 },
  field: { backgroundColor: '#292A30', borderRadius: 10, padding: 18, gap: 8 }, fieldLabel: { color: '#B9B8C0', fontSize: 15 },
  fieldValueRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, fieldValue: { color: '#FFFFFF', fontSize: 20, flex: 1 }, placeholder: { color: '#D5D4DB', fontSize: 20, flex: 1 }, colorDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: '#D5D4DB' },
  switchField: { backgroundColor: '#292A30', borderRadius: 10, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, switchLabel: { color: '#FFFFFF', fontSize: 19, flex: 1 },
  footer: { borderTopWidth: 1, borderTopColor: '#303137', paddingHorizontal: 28, paddingTop: 18, paddingBottom: Platform.OS === 'ios' ? 34 : 22, gap: 12 }, progressText: { color: '#E8E7ED', textAlign: 'center', fontSize: 16 },
  progressTrack: { height: 7, borderRadius: 4, backgroundColor: '#484850', overflow: 'hidden' }, progressFill: { height: '100%', backgroundColor: '#7C4DFF', borderRadius: 4 }, footerButtons: { flexDirection: 'row', gap: 14 },
  backButton: { flex: 1, backgroundColor: '#393A40', paddingVertical: 16, borderRadius: 10, alignItems: 'center' }, backButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' }, nextButton: { flex: 1, backgroundColor: '#7C4DFF', paddingVertical: 16, borderRadius: 10, alignItems: 'center' }, nextButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' }, disabledButton: { opacity: 0.4 },
  camera: { flex: 1 }, cameraClose: { position: 'absolute', top: Platform.OS === 'ios' ? 56 : 32, left: 24, width: 46, height: 46, borderRadius: 23, backgroundColor: '#16171B', alignItems: 'center', justifyContent: 'center' }, cameraFooter: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 46 }, captureButton: { width: 78, height: 78, borderRadius: 39, borderWidth: 5, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }, captureButtonInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFFFFF' },
  previewImage: { flex: 1, width: '100%' }, previewActions: { flexDirection: 'row', gap: 14, padding: 24, paddingBottom: Platform.OS === 'ios' ? 38 : 24 }, primaryButton: { flex: 1, backgroundColor: '#7C4DFF', borderRadius: 10, padding: 16, alignItems: 'center' }, primaryButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' }, secondaryButton: { flex: 1, backgroundColor: '#393A40', borderRadius: 10, padding: 16, alignItems: 'center' }, secondaryButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }, sheet: { backgroundColor: '#23242A', padding: 24, paddingBottom: Platform.OS === 'ios' ? 42 : 28, borderTopLeftRadius: 22, borderTopRightRadius: 22, gap: 16 }, sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10 }, sheetTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '700' }, sheetDescription: { color: '#B9B8C0', fontSize: 16, lineHeight: 23 }, sourceButton: { backgroundColor: '#393A40', borderRadius: 10, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }, sourceButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  modalContainer: { flex: 1, backgroundColor: '#16171B', paddingTop: Platform.OS === 'ios' ? 56 : 32, paddingHorizontal: 24 }, option: { paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#303137' }, optionText: { color: '#FFFFFF', fontSize: 18 },
});
