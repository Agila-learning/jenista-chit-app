import React from 'react';
import { View, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
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

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();
const Tab = createBottomTabNavigator();

// ==========================================
// 1. ADMIN BOTTOM NAVIGATION TABS
// ==========================================
const AdminBottomTabs = ({ navigation }: any) => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: Colors.navy.primary },
        headerTintColor: Colors.white,
        headerTitleStyle: { fontWeight: '800', fontSize: 17 },
        tabBarStyle: {
          backgroundColor: Colors.navy.primary,
          borderTopColor: 'rgba(255, 255, 255, 0.08)',
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: Colors.gold.primary,
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.55)',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
        },
        headerLeft: () => (
          <TouchableOpacity
            style={{ paddingLeft: 16, paddingRight: 8 }}
            onPress={() => navigation.openDrawer()}
          >
            <Ionicons name="menu" size={26} color={Colors.white} />
          </TouchableOpacity>
        ),
        headerRight: () => (
          <TouchableOpacity
            style={{ paddingRight: 16, paddingLeft: 8 }}
            onPress={() => navigation.openDrawer()}
          >
            <Ionicons name="grid-outline" size={22} color={Colors.gold.primary} />
          </TouchableOpacity>
        ),
      }}
    >
      <Tab.Screen
        name="AdminDashboardTab"
        component={AdminDashboardScreen}
        options={{
          title: 'Jenista Chit Funds',
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Ionicons name="grid" size={size || 20} color={color} />,
        }}
      />
      <Tab.Screen
        name="AdminGroupsTab"
        component={ChitGroupListScreen}
        options={{
          title: 'Chit Groups & Plans',
          tabBarLabel: 'Chit Groups',
          tabBarIcon: ({ color, size }) => <Ionicons name="layers" size={size || 20} color={color} />,
        }}
      />
      <Tab.Screen
        name="AdminCustomersTab"
        component={CustomerListScreen}
        options={{
          title: 'Customer Directory',
          tabBarLabel: 'Customers',
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size || 20} color={color} />,
        }}
      />
      <Tab.Screen
        name="AdminReceiptsTab"
        component={ReceiptEntryScreen}
        options={{
          title: 'Receipt Desk & Collections',
          tabBarLabel: 'Receipts',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt" size={size || 20} color={color} />,
        }}
      />
      <Tab.Screen
        name="AdminPaymentsTab"
        component={PaymentVerificationsScreen}
        options={{
          title: 'Payment & Prize Requests',
          tabBarLabel: 'Payments',
          tabBarIcon: ({ color, size }) => <Ionicons name="shield-checkmark" size={size || 20} color={color} />,
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
        headerStyle: { backgroundColor: Colors.navy.primary },
        headerTintColor: Colors.white,
        headerTitleStyle: { fontWeight: '800', fontSize: 17 },
        drawerType: 'front',
        headerLeft: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {route.name !== 'AdminTabs' ? (
              <TouchableOpacity
                style={{ paddingLeft: 16, paddingRight: 8, paddingVertical: 4 }}
                onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('AdminTabs'))}
              >
                <Ionicons name="arrow-back" size={24} color={Colors.white} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={{ paddingLeft: 16, paddingRight: 8 }}
                onPress={() => navigation.openDrawer()}
              >
                <Ionicons name="menu" size={26} color={Colors.white} />
              </TouchableOpacity>
            )}
          </View>
        ),
        headerRight: () => (
          <TouchableOpacity
            style={{ paddingRight: 16, paddingLeft: 8 }}
            onPress={() => navigation.openDrawer()}
          >
            <Ionicons name="grid-outline" size={22} color={Colors.gold.primary} />
          </TouchableOpacity>
        ),
      })}
    >
      <Drawer.Screen
        name="AdminTabs"
        component={AdminBottomTabs}
        options={{ headerShown: false, title: 'Jenista Chit Funds' }}
      />
      <Drawer.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{ title: 'Jenista Chit Funds' }}
      />
      <Drawer.Screen
        name="CustomerList"
        component={CustomerListScreen}
        options={{ title: 'Customer Directory' }}
      />
      <Drawer.Screen
        name="AddCustomer"
        component={AddCustomerScreen}
        options={{ title: 'Register Customer' }}
      />
      <Drawer.Screen
        name="ChitGroupList"
        component={ChitGroupListScreen}
        options={{ title: 'Chit Groups & Plans' }}
      />
      <Drawer.Screen
        name="ReceiptEntry"
        component={ReceiptEntryScreen}
        options={{ title: 'Receipt Desk & Collections', headerShown: false }}
      />
      <Drawer.Screen
        name="Ledger"
        component={LedgerScreen}
        options={{ title: 'General Ledger' }}
      />
      <Drawer.Screen
        name="PaymentVerifications"
        component={PaymentVerificationsScreen}
        options={{ title: 'Payment & Prize Requests' }}
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
        headerStyle: { backgroundColor: Colors.navy.primary },
        headerTintColor: Colors.white,
        headerTitleStyle: { fontWeight: '800', fontSize: 17 },
        tabBarStyle: {
          backgroundColor: Colors.navy.primary,
          borderTopColor: 'rgba(255, 255, 255, 0.08)',
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: Colors.gold.primary,
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.55)',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
        },
        headerLeft: () => (
          <TouchableOpacity
            style={{ paddingLeft: 16, paddingRight: 8 }}
            onPress={() => navigation.openDrawer()}
          >
            <Ionicons name="menu" size={26} color={Colors.white} />
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
          tabBarIcon: ({ color, size }) => <Ionicons name="speedometer" size={size || 20} color={color} />,
        }}
      />
      <Tab.Screen
        name="StaffCollectionsTab"
        component={ReceiptEntryScreen}
        options={{
          title: 'Digital Collections',
          tabBarLabel: 'Collections',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt" size={size || 20} color={color} />,
        }}
      />
      <Tab.Screen
        name="StaffCustomersTab"
        component={CustomerListScreen}
        options={{
          title: 'Members Directory',
          tabBarLabel: 'Customers',
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size || 20} color={color} />,
        }}
      />
      <Tab.Screen
        name="StaffDefaultersTab"
        component={ReportsScreen}
        options={{
          title: 'Overdue Defaulters Queue',
          tabBarLabel: 'Defaulters',
          tabBarIcon: ({ color, size }) => <Ionicons name="alert-circle" size={size || 20} color={color} />,
        }}
      />
      <Tab.Screen
        name="StaffProfileTab"
        component={StaffProfileScreen}
        options={{
          title: 'Agent Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle" size={size || 20} color={color} />,
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
        headerStyle: { backgroundColor: Colors.navy.primary },
        headerTintColor: Colors.white,
        headerTitleStyle: { fontWeight: '800', fontSize: 17 },
        drawerType: 'front',
        headerLeft: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {route.name !== 'StaffTabs' ? (
              <TouchableOpacity
                style={{ paddingLeft: 16, paddingRight: 8, paddingVertical: 4 }}
                onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('StaffTabs'))}
              >
                <Ionicons name="arrow-back" size={24} color={Colors.white} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={{ paddingLeft: 16, paddingRight: 8 }}
                onPress={() => navigation.openDrawer()}
              >
                <Ionicons name="menu" size={26} color={Colors.white} />
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
        headerStyle: { backgroundColor: Colors.navy.primary },
        headerTintColor: Colors.white,
        headerTitleStyle: { fontWeight: '800', fontSize: 17 },
        tabBarStyle: {
          backgroundColor: Colors.navy.primary,
          borderTopColor: 'rgba(255, 255, 255, 0.08)',
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: Colors.gold.primary,
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.55)',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
        },
      }}
    >
      <Tab.Screen
        name="CustomerHomeTab"
        component={CustomerDashboardScreen}
        options={{
          title: 'My Account',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size || 20} color={color} />,
        }}
      />
      <Tab.Screen
        name="CustomerMyChitsTab"
        component={CustomerDashboardScreen}
        options={{
          title: 'My Enrolled Chits',
          tabBarLabel: 'My Chits',
          tabBarIcon: ({ color, size }) => <Ionicons name="wallet" size={size || 20} color={color} />,
        }}
      />
      <Tab.Screen
        name="CustomerPassbookTab"
        component={CustomerScheduleScreen}
        options={{
          title: 'Digital Passbook',
          tabBarLabel: 'Passbook',
          tabBarIcon: ({ color, size }) => <Ionicons name="book" size={size || 20} color={color} />,
        }}
      />
      <Tab.Screen
        name="CustomerPaymentsTab"
        component={CustomerPaymentsScreen}
        options={{
          title: 'Installment Pay Desk',
          tabBarLabel: 'Payments',
          tabBarIcon: ({ color, size }) => <Ionicons name="cash" size={size || 20} color={color} />,
        }}
      />
      <Tab.Screen
        name="CustomerProfileTab"
        component={CustomerProfileScreen}
        options={{
          title: 'Subscriber Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size || 20} color={color} />,
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
        headerStyle: { backgroundColor: Colors.navy.primary },
        headerTintColor: Colors.white,
        headerTitleStyle: { fontWeight: '800' },
        headerLeft: () =>
          route.name !== 'CustomerTabsRoot' ? (
            <TouchableOpacity
              style={{ paddingLeft: 16, paddingRight: 8, paddingVertical: 4 }}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.white} />
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
              options={({ navigation }) => ({
                headerShown: true,
                title: 'Group & Enrolled Members',
                headerStyle: { backgroundColor: Colors.navy.primary },
                headerTintColor: Colors.white,
                headerLeft: () => (
                  <TouchableOpacity
                    style={{ paddingLeft: 16, paddingRight: 8 }}
                    onPress={() => navigation.goBack()}
                  >
                    <Ionicons name="arrow-back" size={24} color={Colors.white} />
                  </TouchableOpacity>
                ),
              })}
            />
            <Stack.Screen
              name="CustomerDetail"
              component={CustomerDetailScreen}
              options={({ navigation }) => ({
                headerShown: true,
                title: 'Member Profile',
                headerStyle: { backgroundColor: Colors.navy.primary },
                headerTintColor: Colors.white,
                headerLeft: () => (
                  <TouchableOpacity
                    style={{ paddingLeft: 16, paddingRight: 8 }}
                    onPress={() => navigation.goBack()}
                  >
                    <Ionicons name="arrow-back" size={24} color={Colors.white} />
                  </TouchableOpacity>
                ),
              })}
            />
            <Stack.Screen
              name="CustomerSchedule"
              component={CustomerScheduleScreen}
              options={({ navigation }) => ({
                headerShown: true,
                title: 'Installment Breakdown',
                headerStyle: { backgroundColor: Colors.navy.primary },
                headerTintColor: Colors.white,
                headerLeft: () => (
                  <TouchableOpacity
                    style={{ paddingLeft: 16, paddingRight: 8 }}
                    onPress={() => navigation.goBack()}
                  >
                    <Ionicons name="arrow-back" size={24} color={Colors.white} />
                  </TouchableOpacity>
                ),
              })}
            />
          </>
        ) : (
          // Admin Flow with Full Sidebar
          <>
            <Stack.Screen name="AdminRoot" component={AdminDrawer} />
            <Stack.Screen
              name="ChitGroupDetail"
              component={ChitGroupDetailScreen}
              options={({ navigation }) => ({
                headerShown: true,
                title: 'Group & Enrolled Members',
                headerStyle: { backgroundColor: Colors.navy.primary },
                headerTintColor: Colors.white,
                headerLeft: () => (
                  <TouchableOpacity
                    style={{ paddingLeft: 16, paddingRight: 8 }}
                    onPress={() => navigation.goBack()}
                  >
                    <Ionicons name="arrow-back" size={24} color={Colors.white} />
                  </TouchableOpacity>
                ),
              })}
            />
            <Stack.Screen
              name="CustomerDetail"
              component={CustomerDetailScreen}
              options={({ navigation }) => ({
                headerShown: true,
                title: 'Member Profile',
                headerStyle: { backgroundColor: Colors.navy.primary },
                headerTintColor: Colors.white,
                headerLeft: () => (
                  <TouchableOpacity
                    style={{ paddingLeft: 16, paddingRight: 8 }}
                    onPress={() => navigation.goBack()}
                  >
                    <Ionicons name="arrow-back" size={24} color={Colors.white} />
                  </TouchableOpacity>
                ),
              })}
            />
            <Stack.Screen
              name="CustomerSchedule"
              component={CustomerScheduleScreen}
              options={({ navigation }) => ({
                headerShown: true,
                title: 'Installment Breakdown',
                headerStyle: { backgroundColor: Colors.navy.primary },
                headerTintColor: Colors.white,
                headerLeft: () => (
                  <TouchableOpacity
                    style={{ paddingLeft: 16, paddingRight: 8 }}
                    onPress={() => navigation.goBack()}
                  >
                    <Ionicons name="arrow-back" size={24} color={Colors.white} />
                  </TouchableOpacity>
                ),
              })}
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
    backgroundColor: Colors.navy.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
