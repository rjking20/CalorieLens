import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

import { useProfileStore } from '@/store/useProfileStore';
import { useMealStore } from '@/store/useMealStore';
import { analyzeFood } from '@/services/gemini';
import { NutritionResult } from '@/components/NutritionResult';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '@/constants/theme';
import { getToday } from '@/utils/helpers';
import { NutritionInfo, MealType } from '@/utils/types';

export default function CameraScreen() {
  const router = useRouter();

  const apiKey = useProfileStore((state) => state.apiKey);
  const setApiKey = useProfileStore((state) => state.setApiKey);
  const addMeal = useMealStore((state) => state.addMeal);

  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<NutritionInfo | null>(null);
  const [showResultModal, setShowResultModal] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Edit nutrition modal states
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editFoodName, setEditFoodName] = useState<string>('');
  const [editCalories, setEditCalories] = useState<string>('');
  const [editProtein, setEditProtein] = useState<string>('');
  const [editCarbs, setEditCarbs] = useState<string>('');
  const [editFat, setEditFat] = useState<string>('');
  const [editServingSize, setEditServingSize] = useState<string>('');

  // Quick API key input state
  const [quickApiKeyInput, setQuickApiKeyInput] = useState<string>('');
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);

  // Process selected image and invoke Gemini Vision
  const processImage = async (uri: string, base64Provided?: string | null) => {
    setSelectedImageUri(uri);
    setErrorMessage(null);

    if (!apiKey || !apiKey.trim()) {
      setErrorMessage('Gemini API key is required to analyze photos.');
      return;
    }

    setAnalyzing(true);

    try {
      let base64 = base64Provided;
      if (!base64) {
        base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      const result = await analyzeFood(base64, apiKey);
      setAnalysisResult(result);
      setShowResultModal(true);
    } catch (err: any) {
      console.error('Food analysis error:', err);
      const msg = err?.message || 'Failed to analyze food. Please try again.';
      setErrorMessage(msg);
      Alert.alert('Analysis Failed', msg);
    } finally {
      setAnalyzing(false);
    }
  };

  // Launch Camera
  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission Needed',
          'Camera access is required to take pictures of your meals.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        await processImage(asset.uri, asset.base64);
      }
    } catch (error: any) {
      console.error('Camera capture error:', error);
      Alert.alert('Camera Error', error?.message || 'Unable to open camera.');
    }
  };

  // Launch Gallery
  const handleChooseFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission Needed',
          'Gallery access is required to pick meal photos.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        await processImage(asset.uri, asset.base64);
      }
    } catch (error: any) {
      console.error('Gallery picker error:', error);
      Alert.alert('Gallery Error', error?.message || 'Unable to open gallery.');
    }
  };

  // Save meal to database and store
  const handleConfirmMeal = async (mealType: string) => {
    if (!analysisResult) return;

    try {
      await addMeal({
        foodName: analysisResult.foodName,
        calories: analysisResult.calories,
        protein: analysisResult.protein,
        carbs: analysisResult.carbs,
        fat: analysisResult.fat,
        mealType: (mealType || 'lunch') as MealType,
        imageUri: selectedImageUri ?? undefined,
        date: getToday(),
      });

      setShowResultModal(false);
      setSelectedImageUri(null);
      setAnalysisResult(null);

      Alert.alert(
        'Meal Logged! 🎉',
        `Successfully logged ${analysisResult.foodName} (${analysisResult.calories} kcal).`,
        [
          { text: 'View Diary', onPress: () => router.push('/(tabs)/diary') },
          { text: 'Scan Another', style: 'cancel' },
        ]
      );
    } catch (error: any) {
      console.error('Failed to save meal:', error);
      Alert.alert('Error', 'Failed to save meal. Please try again.');
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (result: NutritionInfo) => {
    setEditFoodName(result.foodName);
    setEditCalories(String(result.calories));
    setEditProtein(String(result.protein));
    setEditCarbs(String(result.carbs));
    setEditFat(String(result.fat));
    setEditServingSize(result.servingSize);
    setShowResultModal(false);
    setShowEditModal(true);
  };

  // Save changes from Edit Modal
  const handleSaveEdit = () => {
    const updatedResult: NutritionInfo = {
      foodName: editFoodName.trim() || 'Unknown Food',
      calories: Math.max(0, parseInt(editCalories, 10) || 0),
      protein: Math.max(0, parseFloat(editProtein) || 0),
      carbs: Math.max(0, parseFloat(editCarbs) || 0),
      fat: Math.max(0, parseFloat(editFat) || 0),
      servingSize: editServingSize.trim() || '1 serving',
      confidence: analysisResult?.confidence ?? 1.0,
    };

    setAnalysisResult(updatedResult);
    setShowEditModal(false);
    setShowResultModal(true);
  };

  // Reset current selection
  const handleReset = () => {
    setSelectedImageUri(null);
    setAnalysisResult(null);
    setShowResultModal(false);
    setErrorMessage(null);
  };

  // Save quick API key
  const handleSaveApiKey = () => {
    if (!quickApiKeyInput.trim()) {
      Alert.alert('Error', 'Please enter a valid Gemini API key.');
      return;
    }
    setApiKey(quickApiKeyInput.trim());
    setShowApiKeyModal(false);
    setQuickApiKeyInput('');
    setErrorMessage(null);
    Alert.alert('Success', 'Gemini API key saved! You can now analyze meals.');
  };

  const hasApiKey = Boolean(apiKey && apiKey.trim());

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Food Scanner</Text>
          <Text style={styles.headerSubtitle}>
            Snap or upload a photo to identify food & track calories instantly
          </Text>
        </View>

        {/* Missing API Key Banner */}
        {!hasApiKey && (
          <View style={styles.warningCard}>
            <View style={styles.warningHeader}>
              <Ionicons name="key-outline" size={24} color={Colors.accentDark} />
              <Text style={styles.warningTitle}>Gemini API Key Required</Text>
            </View>
            <Text style={styles.warningBody}>
              AI food recognition requires a free Google Gemini 2.0 API key. You can get one for free at Google AI Studio.
            </Text>
            <View style={styles.warningActions}>
              <TouchableOpacity
                style={styles.keyModalButton}
                onPress={() => setShowApiKeyModal(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.keyModalButtonText}>Enter API Key</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.settingsLinkButton}
                onPress={() => router.push('/(tabs)/profile')}
                activeOpacity={0.7}
              >
                <Text style={styles.settingsLinkText}>Go to Profile</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Selected Image Preview & Status */}
        {selectedImageUri ? (
          <View style={styles.previewContainer}>
            <Image source={{ uri: selectedImageUri }} style={styles.previewImage} />

            {analyzing && (
              <View style={styles.analyzingOverlay}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={styles.analyzingText}>Analyzing with Gemini AI...</Text>
                <Text style={styles.analyzingSubtext}>Estimating macros & calories</Text>
              </View>
            )}

            {!analyzing && (
              <View style={styles.previewControls}>
                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={handleReset}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                  <Text style={styles.resetButtonText}>Remove Photo</Text>
                </TouchableOpacity>

                {analysisResult ? (
                  <TouchableOpacity
                    style={styles.viewResultButton}
                    onPress={() => setShowResultModal(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                    <Text style={styles.viewResultText}>View Results</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => processImage(selectedImageUri)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="refresh" size={18} color="#FFFFFF" />
                    <Text style={styles.retryButtonText}>Analyze Again</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        ) : (
          /* Big Visual Capture Buttons */
          <View style={styles.buttonsContainer}>
            {/* Take Photo Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.bigButton, styles.cameraBigButton]}
              onPress={handleTakePhoto}
            >
              <View style={styles.bigButtonIconBubble}>
                <Ionicons name="camera" size={40} color={Colors.primary} />
              </View>
              <Text style={styles.bigButtonTitle}>Take Photo</Text>
              <Text style={styles.bigButtonSubtitle}>
                Point camera at your plate or dish
              </Text>
            </TouchableOpacity>

            {/* Choose from Gallery Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.bigButton, styles.galleryBigButton]}
              onPress={handleChooseFromGallery}
            >
              <View
                style={[
                  styles.bigButtonIconBubble,
                  { backgroundColor: '#FFF3E0' },
                ]}
              >
                <Ionicons name="images" size={40} color={Colors.accent} />
              </View>
              <Text style={styles.bigButtonTitle}>Choose from Gallery</Text>
              <Text style={styles.bigButtonSubtitle}>
                Select an existing food photo
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Error message card */}
        {errorMessage ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={20} color={Colors.danger} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Tips Section */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 Tips for Best AI Results</Text>
          <View style={styles.tipRow}>
            <Ionicons name="sunny-outline" size={18} color={Colors.primary} />
            <Text style={styles.tipText}>
              Ensure adequate lighting and clear visibility of the entire meal.
            </Text>
          </View>
          <View style={styles.tipRow}>
            <Ionicons name="scan-outline" size={18} color={Colors.primary} />
            <Text style={styles.tipText}>
              Capture from a top-down or 45° angle to show portion size accurately.
            </Text>
          </View>
          <View style={styles.tipRow}>
            <Ionicons name="create-outline" size={18} color={Colors.primary} />
            <Text style={styles.tipText}>
              You can always adjust portions, calories, and macros before saving!
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* AI Nutrition Result Modal */}
      <NutritionResult
        result={analysisResult}
        visible={showResultModal}
        onConfirm={handleConfirmMeal}
        onEdit={handleOpenEdit}
        onClose={() => setShowResultModal(false)}
      />

      {/* Edit Values Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.editCard}>
            <View style={styles.editModalHeader}>
              <Text style={styles.editModalTitle}>Edit Nutrition Info</Text>
              <TouchableOpacity
                onPress={() => setShowEditModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Food Name</Text>
              <TextInput
                style={styles.textInput}
                value={editFoodName}
                onChangeText={setEditFoodName}
                placeholder="e.g. Grilled Chicken Salad"
                placeholderTextColor={Colors.textLight}
              />

              <Text style={styles.inputLabel}>Calories (kcal)</Text>
              <TextInput
                style={styles.textInput}
                value={editCalories}
                onChangeText={setEditCalories}
                keyboardType="numeric"
                placeholder="e.g. 450"
                placeholderTextColor={Colors.textLight}
              />

              <View style={styles.macrosInputsRow}>
                <View style={styles.macroInputCol}>
                  <Text style={[styles.inputLabel, { color: Colors.protein }]}>
                    Protein (g)
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    value={editProtein}
                    onChangeText={setEditProtein}
                    keyboardType="numeric"
                    placeholder="25"
                    placeholderTextColor={Colors.textLight}
                  />
                </View>

                <View style={styles.macroInputCol}>
                  <Text style={[styles.inputLabel, { color: Colors.carbs }]}>
                    Carbs (g)
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    value={editCarbs}
                    onChangeText={setEditCarbs}
                    keyboardType="numeric"
                    placeholder="40"
                    placeholderTextColor={Colors.textLight}
                  />
                </View>

                <View style={styles.macroInputCol}>
                  <Text style={[styles.inputLabel, { color: '#F57F17' }]}>
                    Fat (g)
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    value={editFat}
                    onChangeText={setEditFat}
                    keyboardType="numeric"
                    placeholder="12"
                    placeholderTextColor={Colors.textLight}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Serving Size</Text>
              <TextInput
                style={styles.textInput}
                value={editServingSize}
                onChangeText={setEditServingSize}
                placeholder="e.g. 1 bowl (300g)"
                placeholderTextColor={Colors.textLight}
              />

              <View style={styles.editButtonsRow}>
                <TouchableOpacity
                  style={styles.cancelEditButton}
                  onPress={() => setShowEditModal(false)}
                >
                  <Text style={styles.cancelEditText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveEditButton}
                  onPress={handleSaveEdit}
                >
                  <Text style={styles.saveEditText}>Apply Changes</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Quick API Key Modal */}
      <Modal
        visible={showApiKeyModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowApiKeyModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.apiKeyDialog}>
            <Text style={styles.apiDialogTitle}>Set Gemini API Key</Text>
            <Text style={styles.apiDialogDesc}>
              Paste your Google Gemini 2.0 API key below to activate instant AI nutrition estimation:
            </Text>
            <TextInput
              style={[styles.textInput, { marginVertical: Spacing.md }]}
              value={quickApiKeyInput}
              onChangeText={setQuickApiKeyInput}
              placeholder="AIzaSy..."
              placeholderTextColor={Colors.textLight}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.apiDialogButtons}>
              <TouchableOpacity
                style={styles.cancelEditButton}
                onPress={() => setShowApiKeyModal(false)}
              >
                <Text style={styles.cancelEditText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveEditButton}
                onPress={handleSaveApiKey}
              >
                <Text style={styles.saveEditText}>Save Key</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl + 30,
  },
  header: {
    marginBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSize.xxl - 2,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  warningCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#FFE082',
    ...Shadows.sm,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
    gap: 8,
  },
  warningTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.accentDark,
  },
  warningBody: {
    fontSize: FontSize.xs,
    color: Colors.text,
    lineHeight: 18,
  },
  warningActions: {
    flexDirection: 'row',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  keyModalButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
  },
  keyModalButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: FontSize.xs,
  },
  settingsLinkButton: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  settingsLinkText: {
    color: Colors.primaryDark,
    fontWeight: '700',
    fontSize: FontSize.xs,
  },
  buttonsContainer: {
    gap: Spacing.md,
    marginVertical: Spacing.xs,
  },
  bigButton: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg + 4,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  cameraBigButton: {
    borderColor: '#C8E6C9',
  },
  galleryBigButton: {
    borderColor: '#FFE0B2',
  },
  bigButtonIconBubble: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  bigButtonTitle: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 4,
  },
  bigButtonSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  previewContainer: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginVertical: Spacing.xs,
    ...Shadows.md,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 320,
    backgroundColor: '#EEEEEE',
  },
  analyzingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  analyzingText: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: '700',
    marginTop: Spacing.md,
  },
  analyzingSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: FontSize.xs,
    marginTop: 4,
  },
  previewControls: {
    flexDirection: 'row',
    padding: Spacing.md,
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    backgroundColor: '#FFEBEE',
    gap: 6,
  },
  resetButtonText: {
    color: Colors.danger,
    fontWeight: '700',
    fontSize: FontSize.xs,
  },
  viewResultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    ...Shadows.sm,
    gap: 6,
  },
  viewResultText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: FontSize.xs,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.accent,
    gap: 6,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: FontSize.xs,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
    gap: 8,
  },
  errorText: {
    color: Colors.danger,
    fontSize: FontSize.xs,
    flex: 1,
    fontWeight: '500',
  },
  tipsCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    ...Shadows.sm,
  },
  tipsTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs + 2,
    gap: 10,
  },
  tipText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    padding: Spacing.md,
  },
  editCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    maxHeight: '85%',
    ...Shadows.lg,
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  editModalTitle: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text,
  },
  inputLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  textInput: {
    backgroundColor: '#F9F9F9',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: FontSize.sm,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  macrosInputsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  macroInputCol: {
    flex: 1,
  },
  editButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  cancelEditButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  cancelEditText: {
    color: Colors.textSecondary,
    fontWeight: '700',
    fontSize: FontSize.sm,
  },
  saveEditButton: {
    flex: 2,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    ...Shadows.sm,
  },
  saveEditText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: FontSize.sm,
  },
  apiKeyDialog: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.lg,
  },
  apiDialogTitle: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  apiDialogDesc: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  apiDialogButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
});
