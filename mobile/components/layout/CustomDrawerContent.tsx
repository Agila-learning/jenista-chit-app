import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { useAuth } from '../../store/AuthContext';
import { showConfirmDialog } from '../../utils/alert';

export const CustomDrawerContent: React.FC<DrawerContentComponentProps> = (props) => {
  const { user, logout } = useAuth();
  const currentRoute = props.state.routeNames[props.state.index];

  const isStaff = user?.role === 'STAFF' || user?.role === 'COLLECTION_AGENT';
  const isCustomer = user?.role === 'CUSTOMER';

  const navigateTo = (screenName: string, params?: any) => {
    if (!isCustomer && !isStaff) {
      if (screenName === 'CustomerList') {
        props.navigation.navigate('AdminTabs', { screen: 'CustomerList', params });
        return;
      }
      if (screenName === 'ChitGroupList') {
        props.navigation.navigate('AdminTabs', { screen: 'ChitGroupList', params });
        return;
      }
      if (screenName === 'ReceiptEntry') {
        props.navigation.navigate('AdminTabs', { screen: 'ReceiptEntry', params });
        return;
      }
      if (screenName === 'PaymentVerifications') {
        props.navigation.navigate('AdminTabs', { screen: 'PaymentVerifications', params });
        return;
      }
      if (screenName === 'AdminDashboard' || screenName === 'AdminTabs') {
        props.navigation.navigate('AdminTabs', { screen: 'AdminDashboard', params });
        return;
      }
    }
    props.navigation.navigate(screenName, params);
  };

  const displayName = user?.name || (isCustomer ? 'Member' : 'Administrator');
  const roleLabel =
    user?.role === 'CUSTOMER'
      ? 'Member Account'
      : user?.role === 'STAFF' || user?.role === 'COLLECTION_AGENT'
      ? 'Collection Executive'
      : 'Super Administrator';

  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'U';

  const handleSignOut = () => {
    showConfirmDialog(
      'Sign Out',
      'Are you sure you want to sign out of your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Modern Friendly Brand & Profile Header */}
      <View style={styles.header}>
        {/* Brand row with Logo */}
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.logoImg}
              resizeMode="contain"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.brandTitle}>JENISTA CHITS</Text>
            <Text style={styles.brandSubtitle}>Smart Chit Management</Text>
          </View>
        </View>

        {/* User Profile Card */}
        <View style={styles.userProfileCard}>
          <View style={styles.avatarBubble}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName} numberOfLines={1}>{displayName}</Text>
            <View style={styles.roleTag}>
              <View style={styles.roleDot} />
              <Text style={styles.roleTagText}>{roleLabel}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Navigation List Items with Clean User-Friendly Styling */}
      <ScrollView style={styles.menuContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionHeading}>MAIN MENU</Text>

        <DrawerItem
          title="Home Dashboard"
          icon="home"
          iconOutline="home-outline"
          isActive={
            currentRoute === 'AdminDashboard' ||
            currentRoute === 'StaffDashboard' ||
            currentRoute === 'CustomerHome' ||
            currentRoute === 'AdminTabs' ||
            currentRoute === 'StaffTabs'
          }
          onPress={() => navigateTo(isCustomer ? 'CustomerTabsRoot' : isStaff ? 'StaffTabs' : 'AdminTabs')}
        />

        <DrawerItem
          title="Members Directory"
          icon="people"
          iconOutline="people-outline"
          isActive={currentRoute === 'CustomerList'}
          onPress={() => navigateTo('CustomerList')}
        />

        <DrawerItem
          title="Chit Groups & Plans"
          icon="layers"
          iconOutline="layers-outline"
          isActive={currentRoute === 'ChitGroupList'}
          onPress={() => navigateTo('ChitGroupList')}
        />

        <DrawerItem
          title="General Ledger & Payments"
          icon="card"
          iconOutline="card-outline"
          isActive={currentRoute === 'Ledger'}
          onPress={() => navigateTo('Ledger')}
        />

        <DrawerItem
          title="Issue Receipt Voucher"
          icon="receipt"
          iconOutline="receipt-outline"
          isActive={currentRoute === 'ReceiptEntry'}
          onPress={() => navigateTo('ReceiptEntry')}
        />

        <DrawerItem
          title="Customer Support Chat"
          icon="chatbubbles"
          iconOutline="chatbubbles-outline"
          isActive={currentRoute === 'ConversationsList' || currentRoute === 'ChatScreen'}
          onPress={() => navigateTo(isCustomer ? 'ChatScreen' : 'ConversationsList')}
        />

        {!isCustomer && (
          <>
            <View style={styles.menuDivider} />
            <Text style={styles.sectionHeading}>ADMINISTRATION</Text>

            <DrawerItem
              title="Register New Member"
              icon="person-add"
              iconOutline="person-add-outline"
              isActive={currentRoute === 'AddCustomer'}
              onPress={() => navigateTo('AddCustomer')}
            />

            <DrawerItem
              title="Staff & Field Executives"
              icon="people"
              iconOutline="people-outline"
              isActive={currentRoute === 'StaffManagement'}
              onPress={() => navigateTo('StaffManagement')}
            />

            <DrawerItem
              title="Payment Verifications"
              icon="shield-checkmark"
              iconOutline="shield-checkmark-outline"
              isActive={currentRoute === 'PaymentVerifications'}
              onPress={() => navigateTo('PaymentVerifications')}
            />

            <DrawerItem
              title="Company Banks"
              icon="business"
              iconOutline="business-outline"
              isActive={currentRoute === 'ManageBanks'}
              onPress={() => navigateTo('ManageBanks')}
            />

            <DrawerItem
              title="Overdue Dues Report"
              icon="bar-chart"
              iconOutline="bar-chart-outline"
              isActive={currentRoute === 'Reports'}
              onPress={() => navigateTo('Reports')}
            />

            <DrawerItem
              title="Notifications & Broadcasts"
              icon="notifications"
              iconOutline="notifications-outline"
              isActive={currentRoute === 'Notifications'}
              onPress={() => navigateTo('Notifications')}
            />

            <DrawerItem
              title="Website Leads CRM"
              icon="globe"
              iconOutline="globe-outline"
              isActive={currentRoute === 'Leads'}
              onPress={() => navigateTo('Leads')}
            />

            <DrawerItem
              title="Chit Scheme Calculator"
              icon="calculator"
              iconOutline="calculator-outline"
              isActive={currentRoute === 'ChitCalculator'}
              onPress={() => navigateTo('ChitCalculator')}
            />
          </>
        )}

        <View style={styles.menuDivider} />
        <Text style={styles.sectionHeading}>PREFERENCES</Text>

        <DrawerItem
          title="System Settings"
          icon="settings"
          iconOutline="settings-outline"
          isActive={currentRoute === 'Settings'}
          onPress={() => navigateTo('Settings')}
        />

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Modern Friendly Footer Sign Out */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut} activeOpacity={0.8}>
          <View style={styles.logoutIconBox}>
            <Ionicons name="log-out-outline" size={18} color="#DC2626" />
          </View>
          <Text style={styles.logoutText}>Sign Out</Text>
          <Ionicons name="chevron-forward" size={16} color="#94A3B8" style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
        <Text style={styles.versionText}>Jenista Chit Funds • ISO Certified • v1.0.8</Text>
      </View>
    </SafeAreaView>
  );
};

const DrawerItem: React.FC<{
  title: string;
  icon: any;
  iconOutline: any;
  isActive: boolean;
  onPress: () => void;
}> = ({ title, icon, iconOutline, isActive, onPress }) => (
  <TouchableOpacity
    style={[styles.item, isActive && styles.itemActive]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[styles.itemIconBox, isActive && styles.itemIconBoxActive]}>
      <Ionicons
        name={isActive ? icon : iconOutline}
        size={19}
        color={isActive ? '#1D4ED8' : '#64748B'}
      />
    </View>
    <Text style={[styles.itemText, isActive && styles.itemTextActive]}>{title}</Text>
    {isActive && <View style={styles.activePill} />}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  logoImg: {
    width: 42,
    height: 42,
    borderRadius: 10,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.3,
  },
  brandSubtitle: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '700',
    marginTop: 1,
  },
  userProfileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  avatarBubble: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: 0.2,
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  roleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  roleTagText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  menuContainer: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
  },
  sectionHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginTop: 10,
    marginBottom: 6,
    paddingHorizontal: 8,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8,
    marginHorizontal: 6,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginVertical: 1.5,
    gap: 10,
  },
  itemActive: {
    backgroundColor: '#EFF6FF',
  },
  itemIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemIconBoxActive: {
    backgroundColor: '#DBEAFE',
  },
  itemText: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '600',
    color: '#334155',
  },
  itemTextActive: {
    color: '#1D4ED8',
    fontWeight: '800',
  },
  activePill: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: '#1D4ED8',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#FAFAFA',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FFE4E6',
  },
  logoutIconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  versionText: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
});
