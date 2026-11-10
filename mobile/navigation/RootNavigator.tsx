import React from 'react';
import { View, ActivityIndicator, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useAuth } from '../store/AuthContext';

// Drawer Sidebar Content
import { CustomDrawerContent } from '../components/layout/CustomDrawerContent';

// Screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { CustomerListScreen } from '../screens/admin/CustomerListScreen';
import { AddCustomerScreen } from '../screens/admin/AddCustomerScreen';
import { CustomerDetailScreen } from '../screens/admin/CustomerDetailScreen';
import { CustomerScheduleScreen } from '../screens/admin/CustomerScheduleScreen';
import { ChitGroupListScreen } from '../screens/admin/ChitGroupListScreen';
import { ChitGroupDetailScreen } from '../screens/admin/ChitGroupDetailScreen';
import { ReceiptEntryScreen } from '../screens/admin/ReceiptEntryScreen';
import { ReportsScreen } from '../screens/admin/ReportsScreen';
import { ManageBanksScreen } from '../screens/admin/ManageBanksScreen';
import { LedgerScreen } from '../screens/admin/LedgerScreen';
import { PaymentVerificationsScreen } from '../screens/admin/PaymentVerificationsScreen';
import { SettingsScreen } from '../screens/admin/SettingsScreen';
import { NotificationsScreen } from '../screens/admin/NotificationsScreen';
import { LeadsScreen } from '../screens/admin/LeadsScreen';
import { ChitCalculatorScreen } from '../screens/admin/ChitCalculatorScreen';
import { StaffDashboardScreen } from '../screens/staff/StaffDashboardScreen';
import { StaffProfileScreen } from '../screens/staff/StaffProfileScreen';
import { CustomerDashboardScreen } from '../screens/customer/CustomerDashboardScreen';
import { CustomerProfileScreen } from '../screens/customer/CustomerProfileScreen';
import { CustomerPaymentsScreen } from '../screens/customer/CustomerPaymentsScreen';
import { ChatScreen } from '../screens/chat/ChatScreen';
import { ConversationsListScreen } from '../screens/chat/ConversationsListScreen';
import { StaffManagementScreen } from '../screens/admin/StaffManagementScreen';

const APP_HEADER_STYLE = {
  backgroundColor: '#FFFFFF',
  borderBottomColor: 'rgba(215, 169, 40, 0.25)',
  borderBottomWidth: 1.5,
  elevation: 4,
  shadowColor: '#102B63',
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.10,
  shadowRadius: 8,
};

const APP_TAB_BAR_STYLE = {
  backgroundColor: '#FFFFFF',
  borderTopColor: '#E2E8F0',
  borderTopWidth: 1,
  height: Platform.OS === 'ios' ? 88 : 70,
  paddingTop: 6,
  paddingBottom: Platform.OS === 'ios' ? 24 : 6,
  shadowColor: '#102B63',
  shadowOffset: { width: 0, height: -3 },
  shadowOpacity: 0.05,
  shadowRadius: 6,
  elevation: 8,
};

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();
const Tab = createBottomTabNavigator();

// Hidden options for secondary screens inside Tab Navigators so they take ZERO width/space
const HIDDEN_TAB_BAR_OPTIONS = {
  tabBarButton: () => null,
  tabBarItemStyle: { display: 'none' as const },
};

// ==========================================
// 1. ADMIN BOTTOM NAVIGATION TABS
// ==========================================

const AdminBottomTabs = ({ navigation }: any) => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: APP_HEADER_STYLE,
        headerTintColor: '#0F172A',
        headerTitleStyle: { fontWeight: '800', fontSize: 17, color: '#0F172A' },
        headerRight: () => null,
        tabBarStyle: APP_TAB_BAR_STYLE,
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#64748B',
        tabBarItemStyle: { paddingTop: 3, paddingBottom: 3, justifyContent: 'center', alignItems: 'center' },
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: '700',
          marginTop: 2,
          marginBottom: 0,
        },
        headerLeft: () => (
          <TouchableOpacity
            style={{ paddingLeft: 16, paddingRight: 8 }}
            onPress={() => navigation.openDrawer()}
          >
            <Ionicons name="menu" size={26} color="#0F172A" />
          </TouchableOpacity>
        ),
      }}
    >
      <Tab.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{
          title: 'Jenista Chit Funds',
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color }) => <Ionicons name="grid" size={21} color={color} />,
        }}
      />
      <Tab.Screen
        name="ChitGroupList"
        component={ChitGroupListScreen}
        options={{
          title: 'Chit Groups & Plans',
          tabBarLabel: 'Chit Groups',
          tabBarIcon: ({ color }) => <Ionicons name="layers" size={21} color={color} />,
        }}
      />
      <Tab.Screen
        name="CustomerList"
        component={CustomerListScreen}
        options={{
          title: 'Customer Directory',
          tabBarLabel: 'Customers',
          tabBarIcon: ({ color }) => <Ionicons name="people" size={21} color={color} />,
        }}
      />
      <Tab.Screen
        name="ReceiptEntry"
        component={ReceiptEntryScreen}
        options={{
          title: 'Receipt Desk & Collections',
          tabBarLabel: 'Receipts',
          headerShown: false,
          tabBarIcon: ({ color }) => <Ionicons name="receipt" size={21} color={color} />,
        }}
      />
      <Tab.Screen
        name="PaymentVerifications"
        component={PaymentVerificationsScreen}
        options={{
          title: 'Payment & Prize Requests',
          tabBarLabel: 'Payments',
          tabBarIcon: ({ color }) => <Ionicons name="shield-checkmark" size={21} color={color} />,
        }}
      />

      {/* Persistent Bottom Navbar Screens (Accessible from Sidebar / Shortcuts) */}
      <Tab.Screen
        name="Ledger"
        component={LedgerScreen}
        options={{
          title: 'General Ledger',
          ...HIDDEN_TAB_BAR_OPTIONS,
        }}
      />
      <Tab.Screen
        name="ConversationsList"
        component={ConversationsListScreen}
        options={{
          title: 'Customer Support Chat',
          ...HIDDEN_TAB_BAR_OPTIONS,
        }}
      />
      <Tab.Screen
        name="StaffManagement"
        component={StaffManagementScreen}
        options={{
          title: 'Staff & Field Executives',
          ...HIDDEN_TAB_BAR_OPTIONS,
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          title: 'Notifications & Broadcasts',
          ...HIDDEN_TAB_BAR_OPTIONS,
        }}
      />
      <Tab.Screen
        name="Leads"
        component={LeadsScreen}
        options={{
          title: 'Website Enquiries & Leads',
          ...HIDDEN_TAB_BAR_OPTIONS,
        }}
      />
      <Tab.Screen
        name="ChitCalculator"
        component={ChitCalculatorScreen}
        options={{
          title: 'Chit Scheme Calculator',
          ...HIDDEN_TAB_BAR_OPTIONS,
        }}
      />
      <Tab.Screen
        name="ManageBanks"
        component={ManageBanksScreen}
        options={{
          title: 'Company Bank Accounts',
          ...HIDDEN_TAB_BAR_OPTIONS,
        }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsScreen}
        options={{
          title: 'Non-Payers & Defaulters',
          ...HIDDEN_TAB_BAR_OPTIONS,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'System & Policy Settings',
          ...HIDDEN_TAB_BAR_OPTIONS,
        }}
      />
      <Tab.Screen
        name="AddCustomer"
        component={AddCustomerScreen}
        options={{
          title: 'Register Customer',
          ...HIDDEN_TAB_BAR_OPTIONS,
        }}
      />
    </Tab.Navigator>

  );
};

// ==========================================
// 2. ADMIN SIDEBAR DRAWER (All Modules)
// ==========================================
const AdminDrawer = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={({ navigation, route }) => ({
        headerShown: true,
        headerStyle: APP_HEADER_STYLE,
        headerTintColor: '#0F172A',
        headerTitleStyle: { fontWeight: '800', fontSize: 17, color: '#0F172A' },
        headerRight: () => null,
        drawerType: 'front',
        headerLeft: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {route.name !== 'AdminTabs' ? (
              <TouchableOpacity
                style={{ paddingLeft: 16, paddingRight: 8, paddingVertical: 4 }}
                onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('AdminTabs'))}
              >
                <Ionicons name="arrow-back" size={24} color="#0F172A" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={{ paddingLeft: 16, paddingRight: 8 }}
                onPress={() => navigation.openDrawer()}
              >
                <Ionicons name="menu" size={26} color="#0F172A" />
              </TouchableOpacity>
            )}
          </View>
        ),
      })}
    >
      <Drawer.Screen
        name="AdminTabs"
        component={AdminBottomTabs}
        options={{ headerShown: false, title: 'Jenista Chit Funds' }}
      />
      <Drawer.Screen
        name="AddCustomer"
        component={AddCustomerScreen}
        options={{ title: 'Register Customer' }}
      />
      <Drawer.Screen
        name="Ledger"
        component={LedgerScreen}
        options={{ title: 'General Ledger' }}
      />
      <Drawer.Screen
        name="ConversationsList"
        component={ConversationsListScreen}
        options={{ title: 'Customer Support Chat' }}
      />
      <Drawer.Screen
        name="StaffManagement"
        component={StaffManagementScreen}
        options={{ title: 'Staff & Field Executives' }}
      />
      <Drawer.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Notifications & Broadcasts' }}
      />
      <Drawer.Screen
        name="Leads"
        component={LeadsScreen}
        options={{ title: 'Website Enquiries & Leads' }}
      />
      <Drawer.Screen
        name="ChitCalculator"
        component={ChitCalculatorScreen}
        options={{ title: 'Chit Scheme Calculator' }}
      />
      <Drawer.Screen
        name="ManageBanks"
        component={ManageBanksScreen}
        options={{ title: 'Company Bank Accounts' }}
      />
      <Drawer.Screen
        name="Reports"
        component={ReportsScreen}
        options={{ title: 'Non-Payers & Defaulters' }}
      />
      <Drawer.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'System & Policy Settings' }}
      />
    </Drawer.Navigator>
  );
};

// ==========================================
// 3. STAFF BOTTOM NAVIGATION TABS
// ==========================================
const StaffBottomTabs = ({ navigation }: any) => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: APP_HEADER_STYLE,
        headerTintColor: '#0F172A',
        headerTitleStyle: { fontWeight: '800', fontSize: 17, color: '#0F172A' },
        headerRight: () => null,
        tabBarStyle: APP_TAB_BAR_STYLE,
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#64748B',
        tabBarItemStyle: { paddingTop: 3, paddingBottom: 3, justifyContent: 'center', alignItems: 'center' },
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: '700',
          marginTop: 2,
          marginBottom: 0,
        },
        headerLeft: () => (
          <TouchableOpacity
            style={{ paddingLeft: 16, paddingRight: 8 }}
            onPress={() => navigation.openDrawer()}
          >
            <Ionicons name="menu" size={26} color="#0F172A" />
          </TouchableOpacity>
        ),
      }}
    >
      <Tab.Screen
        name="StaffDashboardTab"
        component={StaffDashboardScreen}
        options={{
          title: 'Field Collections',
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color }) => <Ionicons name="speedometer" size={21} color={color} />,
        }}
      />
      <Tab.Screen
        name="StaffCollectionsTab"
        component={ReceiptEntryScreen}
        options={{
          title: 'Digital Collections',
          tabBarLabel: 'Collections',
          headerShown: false,
          tabBarIcon: ({ color }) => <Ionicons name="receipt" size={21} color={color} />,
        }}
      />
      <Tab.Screen
        name="StaffCustomersTab"
        component={CustomerListScreen}
        options={{
          title: 'Members Directory',
          tabBarLabel: 'Customers',
          tabBarIcon: ({ color }) => <Ionicons name="people" size={21} color={color} />,
        }}
      />
      <Tab.Screen
        name="StaffDefaultersTab"
        component={ReportsScreen}
        options={{
          title: 'Overdue Defaulters Queue',
          tabBarLabel: 'Defaulters',
          tabBarIcon: ({ color }) => <Ionicons name="alert-circle" size={21} color={color} />,
        }}
      />
      <Tab.Screen
        name="StaffProfileTab"
        component={StaffProfileScreen}
        options={{
          title: 'Agent Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <Ionicons name="person-circle" size={21} color={color} />,
        }}
      />

      {/* Secondary screens with persistent bottom navigation */}
      <Tab.Screen
        name="ConversationsList"
        component={ConversationsListScreen}
        options={{
          title: 'Customer Support Chat',
          ...HIDDEN_TAB_BAR_OPTIONS,
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          title: 'Notices & Broadcasts',
          ...HIDDEN_TAB_BAR_OPTIONS,
        }}
      />
      <Tab.Screen
        name="ChitCalculator"
        component={ChitCalculatorScreen}
        options={{
          title: 'Chit Scheme Calculator',
          ...HIDDEN_TAB_BAR_OPTIONS,
        }}
      />
      <Tab.Screen
        name="AddCustomer"
        component={AddCustomerScreen}
        options={{
          title: 'Register Member',
          ...HIDDEN_TAB_BAR_OPTIONS,
        }}
      />
    </Tab.Navigator>


  );
};

// ==========================================
// 4. STAFF SIDEBAR DRAWER
// ==========================================
const StaffDrawer = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={({ navigation, route }) => ({
        headerShown: true,
        headerStyle: APP_HEADER_STYLE,
        headerTintColor: '#0F172A',
        headerTitleStyle: { fontWeight: '800', fontSize: 17, color: '#0F172A' },
        headerRight: () => null,
        drawerType: 'front',
        headerLeft: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {route.name !== 'StaffTabs' ? (
              <TouchableOpacity
                style={{ paddingLeft: 16, paddingRight: 8, paddingVertical: 4 }}
                onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('StaffTabs'))}
              >
                <Ionicons name="arrow-back" size={24} color="#0F172A" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={{ paddingLeft: 16, paddingRight: 8 }}
                onPress={() => navigation.openDrawer()}
              >
                <Ionicons name="menu" size={26} color="#0F172A" />
              </TouchableOpacity>
            )}
          </View>
        ),
      })}
    >
      <Drawer.Screen
        name="StaffTabs"
        component={StaffBottomTabs}
        options={{ headerShown: false, title: 'Field Operations' }}
      />
      <Drawer.Screen
        name="StaffDashboard"
        component={StaffDashboardScreen}
        options={{ title: 'Field Collections' }}
      />
      <Drawer.Screen
        name="CustomerList"
        component={CustomerListScreen}
        options={{ title: 'Members Directory' }}
      />
      <Drawer.Screen
        name="AddCustomer"
        component={AddCustomerScreen}
        options={{ title: 'Register Member' }}
      />
      <Drawer.Screen
        name="ReceiptEntry"
        component={ReceiptEntryScreen}
        options={{ title: 'Issue Receipt Voucher', headerShown: false }}
      />
      <Drawer.Screen
        name="ConversationsList"
        component={ConversationsListScreen}
        options={{ title: 'Customer Support Chat' }}
      />
      <Drawer.Screen
        name="Reports"
        component={ReportsScreen}
        options={{ title: 'Overdue Dues Report' }}
      />
    </Drawer.Navigator>
  );
};

// ==========================================
// 5. SUBSCRIBER / CUSTOMER BOTTOM TABS
// ==========================================
const CustomerBottomTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: APP_HEADER_STYLE,
        headerTintColor: '#0F172A',
        headerTitleStyle: { fontWeight: '800', fontSize: 17, color: '#0F172A' },
        headerRight: () => null,
        tabBarStyle: APP_TAB_BAR_STYLE,
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#64748B',
        tabBarItemStyle: { paddingTop: 3, paddingBottom: 3, justifyContent: 'center', alignItems: 'center' },
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: '700',
          marginTop: 2,
          marginBottom: 0,
        },
      }}
    >
      <Tab.Screen
        name="CustomerHomeTab"
        component={CustomerDashboardScreen}
        options={{
          title: 'My Account',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <Ionicons name="home" size={21} color={color} />,
        }}
      />
      <Tab.Screen
        name="CustomerChatTab"
        component={ChatScreen}
        options={{
          title: 'Customer Support Desk',
          tabBarLabel: 'Support Chat',
          tabBarIcon: ({ color }) => <Ionicons name="chatbubbles" size={21} color={color} />,
        }}
      />
      <Tab.Screen
        name="CustomerPassbookTab"
        component={CustomerScheduleScreen}
        options={{
          title: 'Digital Passbook',
          tabBarLabel: 'Passbook',
          tabBarIcon: ({ color }) => <Ionicons name="book" size={21} color={color} />,
        }}
      />
      <Tab.Screen
        name="CustomerPaymentsTab"
        component={CustomerPaymentsScreen}
        options={{
          title: 'Installment Pay Desk',
          tabBarLabel: 'Payments',
          tabBarIcon: ({ color }) => <Ionicons name="cash" size={21} color={color} />,
        }}
      />
      <Tab.Screen
        name="CustomerProfileTab"
        component={CustomerProfileScreen}
        options={{
          title: 'Subscriber Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <Ionicons name="person" size={21} color={color} />,
        }}
      />

      {/* Secondary screens with persistent bottom navigation */}
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          title: 'Notices & Announcements',
          ...HIDDEN_TAB_BAR_OPTIONS,
        }}
      />
      <Tab.Screen
        name="ChitCalculator"
        component={ChitCalculatorScreen}
        options={{
          title: 'Chit Scheme Calculator',
          ...HIDDEN_TAB_BAR_OPTIONS,
        }}
      />
    </Tab.Navigator>


  );
};

// ==========================================
// 6. CUSTOMER ROOT STACK
// ==========================================
const CustomerStack = () => {
  return (
    <Stack.Navigator
      screenOptions={({ navigation, route }) => ({
        headerStyle: APP_HEADER_STYLE,
        headerTintColor: '#0F172A',
        headerTitleStyle: { fontWeight: '800', color: '#0F172A' },
        headerRight: () => null,
        headerLeft: () =>
          route.name !== 'CustomerTabsRoot' ? (
            <TouchableOpacity
              style={{ paddingLeft: 16, paddingRight: 8, paddingVertical: 4 }}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#0F172A" />
            </TouchableOpacity>
          ) : undefined,
      })}
    >
      <Stack.Screen
        name="CustomerTabsRoot"
        component={CustomerBottomTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CustomerSchedule"
        component={CustomerScheduleScreen}
        options={{ title: 'Chit Installment Schedule' }}
      />
      <Stack.Screen
        name="ChatScreen"
        component={ChatScreen}
        options={{ title: 'Customer Support' }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Notices & Announcements' }}
      />
      <Stack.Screen
        name="ChitCalculator"
        component={ChitCalculatorScreen}
        options={{ title: 'Chit Scheme Calculator' }}
      />
    </Stack.Navigator>
  );
};

const getLightStackHeaderOptions = (title: string) => ({ navigation }: any) => ({
  headerShown: true,
  title,
  headerStyle: APP_HEADER_STYLE,
  headerTintColor: '#0F172A',
  headerTitleStyle: { fontWeight: '800' as const, fontSize: 17, color: '#0F172A' },
  headerRight: () => null,
  headerLeft: () => (
    <TouchableOpacity
      style={{ paddingLeft: 16, paddingRight: 8 }}
      onPress={() => navigation.goBack()}
    >
      <Ionicons name="arrow-back" size={24} color="#0F172A" />
    </TouchableOpacity>
  ),
});

export const RootNavigator = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary[600]} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated || !user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : user.role === 'CUSTOMER' ? (
          <Stack.Screen name="CustomerRoot" component={CustomerStack} />
        ) : user.role === 'STAFF' || user.role === 'COLLECTION_AGENT' ? (
          <>
            <Stack.Screen name="StaffRoot" component={StaffDrawer} />
            <Stack.Screen
              name="ChitGroupDetail"
              component={ChitGroupDetailScreen}
              options={getLightStackHeaderOptions('Group & Enrolled Members')}
            />
            <Stack.Screen
              name="CustomerDetail"
              component={CustomerDetailScreen}
              options={getLightStackHeaderOptions('Member Profile')}
            />
            <Stack.Screen
              name="CustomerSchedule"
              component={CustomerScheduleScreen}
              options={getLightStackHeaderOptions('Installment Breakdown')}
            />
            <Stack.Screen
              name="Ledger"
              component={LedgerScreen}
              options={getLightStackHeaderOptions('Payment History & Ledger')}
            />
            <Stack.Screen
              name="Reports"
              component={ReportsScreen}
              options={getLightStackHeaderOptions('Overdue Dues Report')}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={getLightStackHeaderOptions('System & Policy Settings')}
            />
            <Stack.Screen
              name="AddCustomer"
              component={AddCustomerScreen}
              options={getLightStackHeaderOptions('Register Customer')}
            />
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
              options={getLightStackHeaderOptions('Notifications & Broadcasts')}
            />
            <Stack.Screen
              name="Leads"
              component={LeadsScreen}
              options={getLightStackHeaderOptions('Website Enquiries & Leads')}
            />
            <Stack.Screen
              name="ChitCalculator"
              component={ChitCalculatorScreen}
              options={getLightStackHeaderOptions('Chit Scheme Calculator')}
            />
            <Stack.Screen
              name="ManageBanks"
              component={ManageBanksScreen}
              options={getLightStackHeaderOptions('Company Bank Accounts')}
            />
            <Stack.Screen
              name="ChatScreen"
              component={ChatScreen}
              options={getLightStackHeaderOptions('Customer Support')}
            />
            <Stack.Screen
              name="ConversationsList"
              component={ConversationsListScreen}
              options={getLightStackHeaderOptions('Support Inbox')}
            />
            <Stack.Screen
              name="StaffManagement"
              component={StaffManagementScreen}
              options={getLightStackHeaderOptions('Staff & Field Executives')}
            />
          </>
        ) : (
          // Admin Flow with Full Sidebar
          <>
            <Stack.Screen name="AdminRoot" component={AdminDrawer} />
            <Stack.Screen
              name="ChitGroupDetail"
              component={ChitGroupDetailScreen}
              options={getLightStackHeaderOptions('Group & Enrolled Members')}
            />
            <Stack.Screen
              name="CustomerDetail"
              component={CustomerDetailScreen}
              options={getLightStackHeaderOptions('Member Profile')}
            />
            <Stack.Screen
              name="CustomerSchedule"
              component={CustomerScheduleScreen}
              options={getLightStackHeaderOptions('Installment Breakdown')}
            />
            <Stack.Screen
              name="Ledger"
              component={LedgerScreen}
              options={getLightStackHeaderOptions('Payment History & Ledger')}
            />
            <Stack.Screen
              name="Reports"
              component={ReportsScreen}
              options={getLightStackHeaderOptions('Overdue Dues Report')}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={getLightStackHeaderOptions('System & Policy Settings')}
            />
            <Stack.Screen
              name="AddCustomer"
              component={AddCustomerScreen}
              options={getLightStackHeaderOptions('Register Customer')}
            />
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
              options={getLightStackHeaderOptions('Notifications & Broadcasts')}
            />
            <Stack.Screen
              name="Leads"
              component={LeadsScreen}
              options={getLightStackHeaderOptions('Website Enquiries & Leads')}
            />
            <Stack.Screen
              name="ChitCalculator"
              component={ChitCalculatorScreen}
              options={getLightStackHeaderOptions('Chit Scheme Calculator')}
            />
            <Stack.Screen
              name="ManageBanks"
              component={ManageBanksScreen}
              options={getLightStackHeaderOptions('Company Bank Accounts')}
            />
            <Stack.Screen
              name="ChatScreen"
              component={ChatScreen}
              options={getLightStackHeaderOptions('Customer Support')}
            />
            <Stack.Screen
              name="ConversationsList"
              component={ConversationsListScreen}
              options={getLightStackHeaderOptions('Support Inbox')}
            />
            <Stack.Screen
              name="StaffManagement"
              component={StaffManagementScreen}
              options={getLightStackHeaderOptions('Staff & Field Executives')}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
