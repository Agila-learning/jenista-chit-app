import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { apiClient } from '../../services/api';

export const AddCustomerScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [aadhar, setAadhar] = useState('');
  const [pan, setPan] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');

  // Documents
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [aadharDocUri, setAadharDocUri] = useState<string | null>(null);
  const [panDocUri, setPanDocUri] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const pickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!res.canceled && res.assets && res.assets.length > 0) {
      setPhotoUri(res.assets[0].uri);
    }
  };

  const pickDocument = async (type: 'aadhar' | 'pan') => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        if (type === 'aadhar') setAadharDocUri(res.assets[0].uri);
        else setPanDocUri(res.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Error', 'Unable to pick document');
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Customer Name is required.');
      return;
    }
    if (!mobile.trim() || mobile.replace(/\D/g, '').length < 10) {
      Alert.alert('Validation Error', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        fullName: name.trim(),
        name: name.trim(),
        phone: mobile.trim(),
        mobile: mobile.trim(),
        email: email.trim(),
        aadhar: aadhar.trim(),
        pan: pan.trim(),
        address: address.trim(),
        city: city.trim(),
        pincode: pincode.trim(),
        status: 'ACTIVE',
      };

      await apiClient('/customers', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      Alert.alert('Success', 'Customer registered successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Failed to register customer', err.message || 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.headerTitle}>Add New Member</Text>
      <Text style={styles.headerSubtitle}>
        Register customer details and KYC documents
      </Text>

      {/* Profile Photo Picker */}
      <View style={styles.avatarSection}>
        <TouchableOpacity style={styles.avatarPicker} onPress={pickPhoto}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="camera-outline" size={28} color={Colors.secondary[500]} />
              <Text style={styles.avatarLabel}>Upload Photo</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <Input
        label="Customer Full Name *"
        placeholder="e.g. Ramesh Babu"
        value={name}
        onChangeText={setName}
      />

      <Input
        label="Mobile Number *"
        placeholder="10-digit mobile number"
        keyboardType="phone-pad"
        maxLength={10}
        value={mobile}
        onChangeText={setMobile}
      />

      <Input
        label="Email Address (Optional)"
        placeholder="ramesh@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <View style={styles.row}>
        <View style={styles.half}>
          <Input
            label="Aadhaar Number"
            placeholder="12-digit number"
            keyboardType="number-pad"
            maxLength={12}
            value={aadhar}
            onChangeText={setAadhar}
          />
        </View>
        <View style={styles.half}>
          <Input
            label="PAN Number"
            placeholder="ABCDE1234F"
            autoCapitalize="characters"
            maxLength={10}
            value={pan}
            onChangeText={setPan}
          />
        </View>
      </View>

      <Input
        label="Street Address"
        placeholder="Door No, Street name"
        value={address}
        onChangeText={setAddress}
      />

      <View style={styles.row}>
        <View style={styles.half}>
          <Input
            label="City"
            placeholder="Thoothukudi"
            value={city}
            onChangeText={setCity}
          />
        </View>
        <View style={styles.half}>
          <Input
            label="Pincode"
            placeholder="628103"
            keyboardType="number-pad"
            maxLength={6}
            value={pincode}
            onChangeText={setPincode}
          />
        </View>
      </View>

      {/* KYC Document Uploads */}
      <Text style={styles.docSectionTitle}>KYC Document Attachments</Text>

      <TouchableOpacity
        style={styles.docUploadRow}
        onPress={() => pickDocument('aadhar')}
      >
        <Ionicons
          name={aadharDocUri ? 'checkmark-circle' : 'cloud-upload-outline'}
          size={24}
          color={aadharDocUri ? Colors.success : Colors.secondary[500]}
        />
        <View style={styles.docInfo}>
          <Text style={styles.docName}>Aadhaar Card Copy</Text>
          <Text style={styles.docStatus}>
            {aadharDocUri ? 'Attachment Selected' : 'Tap to upload PNG/JPG/PDF'}
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.docUploadRow}
        onPress={() => pickDocument('pan')}
      >
        <Ionicons
          name={panDocUri ? 'checkmark-circle' : 'cloud-upload-outline'}
          size={24}
          color={panDocUri ? Colors.success : Colors.secondary[500]}
        />
        <View style={styles.docInfo}>
          <Text style={styles.docName}>PAN Card Copy</Text>
          <Text style={styles.docStatus}>
            {panDocUri ? 'Attachment Selected' : 'Tap to upload PNG/JPG/PDF'}
          </Text>
        </View>
      </TouchableOpacity>

      <Button
        title="Submit & Register Customer"
        onPress={handleSave}
        isLoading={isLoading}
        style={styles.saveBtn}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary[50],
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.secondary[900],
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.secondary[500],
    marginBottom: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarPicker: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.secondary[100],
    borderWidth: 2,
    borderColor: Colors.secondary[200],
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    alignItems: 'center',
  },
  avatarLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.secondary[600],
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  half: {
    flex: 1,
  },
  docSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.secondary[800],
    marginTop: 12,
    marginBottom: 10,
  },
  docUploadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.secondary[200],
    marginBottom: 10,
    gap: 12,
  },
  docInfo: {
    flex: 1,
  },
  docName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary[900],
  },
  docStatus: {
    fontSize: 11,
    color: Colors.secondary[500],
    marginTop: 2,
  },
  saveBtn: {
    marginTop: 20,
  },
});
