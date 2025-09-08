// =============================================
// 🍑 PEACH FC 전용 앱 — Expo (React Native) + Supabase Starter
// ---------------------------------------------
// 목적: 우리 팀(PEACH FC)만 쓰는 1팀 전용 앱 (팀 선택/생성 X)
// 기능: 로그인 → 홈(다음 경기/공지), 일정 목록/상세, 참석 체크, 프로필
// 색상: 피치(포인트) + 다크 텍스트
// =============================================

// =============================================
// package.json
// =============================================
{
  "name": "peach-fc-app",
  "version": "0.1.0",
  "private": true,
  "main": "index.js",
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "web": "expo start --web"
  },
  "dependencies": {
    "@react-native-async-storage/async-storage": "^1.23.1",
    "@react-navigation/native": "^6.1.17",
    "@react-navigation/native-stack": "^6.10.1",
    "@react-navigation/bottom-tabs": "^6.6.2",
    "expo": "^51.0.0",
    "expo-linking": "~6.3.1",
    "expo-status-bar": "~1.12.1",
    "react": "18.2.0",
    "react-native": "0.74.0",
    "react-native-gesture-handler": "~2.16.1",
    "react-native-safe-area-context": "^4.10.5",
    "react-native-screens": "~3.31.1",
    "@supabase/supabase-js": "^2.45.4"
  },
  "devDependencies": {
    "@types/react": "18.2.45",
    "@types/react-native": "0.73.0",
    "typescript": "^5.4.0"
  }
}

// =============================================
// .gitignore  ← 민감/불필요 파일 업로드 방지
// =============================================
node_modules/
.expo/
.env
*.log
.DS_Store

// =============================================
// app.json (또는 app.config.js)
// =============================================
{
  "expo": {
    "name": "PEACH FC",
    "slug": "peach-fc-app",
    "scheme": "peachfc",
    "platforms": ["ios", "android", "web"],
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": { "image": "./assets/splash.png", "resizeMode": "contain", "backgroundColor": "#ffffff" },
    "updates": { "fallbackToCacheTimeout": 0 },
    "assetBundlePatterns": ["**/*"],
    "ios": { "supportsTablet": true },
    "android": {
      "adaptiveIcon": { "foregroundImage": "./assets/adaptive-icon.png", "backgroundColor": "#ffffff" }
    },
    "web": { "bundler": "metro", "output": "static" }
  }
}

// =============================================
// tsconfig.json
// =============================================
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "jsx": "react",
    "strict": true,
    "moduleResolution": "node",
    "allowJs": false,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "skipLibCheck": true,
    "types": ["react", "react-native"]
  },
  "include": ["**/*.ts", "**/*.tsx"]
}

// =============================================
// .env.example (실제로는 .env로 만들고 값 입력)
// =============================================
// EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
// EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// =============================================
// index.js (Expo entry)
// =============================================
import { registerRootComponent } from 'expo';
import App from './src/App';
registerRootComponent(App);

// =============================================
// src/config/team.ts  ← 우리 팀 상수 정의
// =============================================
export const TEAM_NAME = 'PEACH FC';
// 팀 UUID는 Supabase SQL seed 후 복사해와서 넣어주세요.
export const TEAM_ID = '00000000-0000-0000-0000-000000000000'; // 나중에 실제 값으로 교체!
export const BRAND = {
  primary: '#FF7A85', // 피치 핑크
  text: '#111827',
  card: '#FFF1F2'
};

// =============================================
// src/lib/supabase.ts
// =============================================
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});

// =============================================
// src/context/AuthProvider.tsx
// =============================================
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  signInWithMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signInWithMagicLink = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: 'peachfc://auth' } });
    if (error) throw error;
  };

  const signOut = async () => { await supabase.auth.signOut(); };

  return (
    <AuthContext.Provider value={{ user, session, signInWithMagicLink, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

// =============================================
// src/navigation/RootNavigator.tsx
// =============================================
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import Tabs from './Tabs';
import { useAuth } from '../context/AuthProvider';

const Stack = createNativeStackNavigator();

const RootNavigator: React.FC = () => {
  const { user } = useAuth();
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="Tabs" component={Tabs} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;

// =============================================
// src/navigation/Tabs.tsx
// =============================================
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import EventsScreen from '../screens/EventsScreen';
import EventDetailScreen from '../screens/EventDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const EventsStack = createNativeStackNavigator();

const EventsStackNav = () => (
  <EventsStack.Navigator>
    <EventsStack.Screen name="EventsHome" component={EventsScreen} options={{ title: '일정' }} />
    <EventsStack.Screen name="EventDetail" component={EventDetailScreen} options={{ title: '상세' }} />
  </EventsStack.Navigator>
);

const Tabs: React.FC = () => {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: '홈' }} />
      <Tab.Screen name="Events" component={EventsStackNav} options={{ title: '일정' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: '프로필' }} />
    </Tab.Navigator>
  );
};

export default Tabs;

// =============================================
// src/App.tsx
// =============================================
import React from 'react';
import { AuthProvider } from './context/AuthProvider';
import RootNavigator from './navigation/RootNavigator';

const App: React.FC = () => (
  <AuthProvider>
    <RootNavigator />
  </AuthProvider>
);

export default App;

// =============================================
// src/screens/LoginScreen.tsx
// =============================================
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthProvider';
import { BRAND } from '../config/team';

const LoginScreen: React.FC = () => {
  const { signInWithMagicLink } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    if (!email) return Alert.alert('이메일을 입력해주세요');
    try {
      setLoading(true);
      await signInWithMagicLink(email.trim());
      Alert.alert('로그인 링크 전송', '이메일을 확인해주세요.');
    } catch (e: any) {
      Alert.alert('로그인 오류', e.message);
    } finally { setLoading(false); }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🍑 PEACH FC</Text>
      <Text style={styles.subtitle}>팀 전용 로그인</Text>
      <TextInput
        style={styles.input}
        placeholder="email@example.com"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TouchableOpacity style={styles.btn} onPress={onLogin} disabled={loading}>
        <Text style={styles.btnText}>{loading ? '전송 중…' : '매직 링크 보내기'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 30, fontWeight: '800', color: BRAND.primary },
  subtitle: { marginTop: 6, marginBottom: 20, color: '#6b7280' },
  input: { width: '100%', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 14, marginBottom: 12 },
  btn: { backgroundColor: BRAND.primary, paddingVertical: 14, paddingHorizontal: 18, borderRadius: 12, width: '100%' },
  btnText: { color: '#fff', textAlign: 'center', fontSize: 16, fontWeight: '700' },
});

export default LoginScreen;

// =============================================
// src/types.ts
// =============================================
export type EventRow = {
  id: string;
  team_id: string;
  title: string;
  type: 'match' | 'training' | 'meeting';
  start_at: string; // ISO string
  end_at: string;   // ISO string
  place?: string | null;
  note?: string | null;
};

export type AttendanceRow = {
  event_id: string;
  user_id: string;
  status: 'yes' | 'no' | 'maybe';
  comment?: string | null;
};

// =============================================
// src/screens/HomeScreen.tsx
// =============================================
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BRAND, TEAM_NAME, TEAM_ID } from '../config/team';
import { supabase } from '../lib/supabase';
import type { EventRow } from '../types';

const HomeScreen: React.FC = () => {
  const [nextEvent, setNextEvent] = useState<EventRow | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: e } = await supabase
        .from('events')
        .select('*')
        .eq('team_id', TEAM_ID)
        .gt('start_at', new Date().toISOString())
        .order('start_at', { ascending: true })
        .limit(1);
      setNextEvent(e?.[0] ?? null);

      const { data: n } = await supabase
        .from('team_notices')
        .select('content')
        .eq('team_id', TEAM_ID)
        .order('created_at', { ascending: false })
        .limit(1);
      setNotice(n?.[0]?.content ?? null);
    })();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>🍑 {TEAM_NAME}</Text>
      {notice ? (
        <View style={styles.notice}><Text style={styles.noticeText}>{notice}</Text></View>
      ) : null}
      <Text style={styles.h2}>다음 일정</Text>
      {nextEvent ? (
        <View style={styles.card}>
          <Text style={styles.title}>{nextEvent.title}</Text>
          <Text style={styles.meta}>{new Date(nextEvent.start_at).toLocaleString()} · {nextEvent.place ?? '장소 미정'}</Text>
        </View>
      ) : (
        <Text style={{ color: '#6b7280' }}>다가오는 일정이 없습니다.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  h1: { fontSize: 24, fontWeight: '800', color: BRAND.text, marginBottom: 8 },
  h2: { fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  card: { backgroundColor: BRAND.card, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#fee2e2' },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  meta: { color: '#4b5563' },
  notice: { backgroundColor: '#FFF7ED', borderColor: '#FED7AA', borderWidth: 1, padding: 12, borderRadius: 12 },
  noticeText: { color: '#9A3412' }
});

export default HomeScreen;

// =============================================
// src/screens/EventsScreen.tsx (TEAM_ID 필터 고정)
// =============================================
import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { EventRow } from '../types';
import { TEAM_ID, BRAND } from '../config/team';

const EventsScreen: React.FC = () => {
  const nav = useNavigation<any>();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('team_id', TEAM_ID)
      .order('start_at', { ascending: true })
      .limit(200);
    setEvents((data ?? []) as EventRow[]);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const Item = ({ item }: { item: EventRow }) => (
    <TouchableOpacity style={styles.card} onPress={() => nav.navigate('EventDetail', { id: item.id })}>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.meta}>{new Date(item.start_at).toLocaleString()} — {item.place ?? '장소 미정'}</Text>
      <Text style={styles.badge}>{item.type}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <FlatList
        data={events}
        keyExtractor={(it) => it.id}
        renderItem={Item}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 40 }}>등록된 일정이 없습니다.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: BRAND.card, padding: 14, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#fee2e2' },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  meta: { color: '#4b5563', marginBottom: 8 },
  badge: { alignSelf: 'flex-start', backgroundColor: BRAND.primary, color: '#fff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, overflow: 'hidden', textTransform: 'uppercase', fontSize: 12 }
});

export default EventsScreen;

// =============================================
// src/screens/EventDetailScreen.tsx (팀 고정 + 참석)
// =============================================
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthProvider';
import type { EventRow } from '../types';
import { BRAND } from '../config/team';

const EventDetailScreen: React.FC = () => {
  const route = useRoute<any>();
  const { user } = useAuth();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [myStatus, setMyStatus] = useState<'yes'|'no'|'maybe'|null>(null);

  const load = async () => {
    const { data: e } = await supabase.from('events').select('*').eq('id', route.params.id).single();
    setEvent(e as EventRow);
    if (!user) return;
    const { data: a } = await supabase.from('event_attendance').select('*').eq('event_id', route.params.id).eq('user_id', user.id).maybeSingle();
    setMyStatus(a?.status ?? null);
  };

  useEffect(() => { load(); }, [route.params?.id]);

  const updateStatus = async (status: 'yes'|'no'|'maybe') => {
    if (!user) return Alert.alert('로그인이 필요합니다');
    const { error } = await supabase.from('event_attendance').upsert({ event_id: route.params.id, user_id: user.id, status }, { onConflict: 'event_id,user_id' });
    if (error) return Alert.alert('오류', error.message);
    setMyStatus(status);
  };

  if (!event) return <View style={{ flex:1, alignItems: 'center', justifyContent:'center' }}><Text>불러오는 중…</Text></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>{event.title}</Text>
      <Text style={styles.meta}>{new Date(event.start_at).toLocaleString()} · {event.place ?? '장소 미정'}</Text>
      {event.note ? <Text style={styles.note}>{event.note}</Text> : null}

      <Text style={styles.h2}>내 참석 상태</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity style={[styles.btn, myStatus==='yes' && styles.btnActive]} onPress={() => updateStatus('yes')}><Text style={styles.btnText}>참석</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.btn, myStatus==='maybe' && styles.btnActive]} onPress={() => updateStatus('maybe')}><Text style={styles.btnText}>미정</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.btn, myStatus==='no' && styles.btnActive]} onPress={() => updateStatus('no')}><Text style={styles.btnText}>불참</Text></TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  h1: { fontSize: 22, fontWeight: '800', marginBottom: 6 },
  meta: { color: '#4b5563', marginBottom: 10 },
  note: { backgroundColor: '#f9fafb', padding: 12, borderRadius: 12, marginBottom: 16 },
  h2: { fontSize: 16, fontWeight: '700', marginVertical: 10 },
  btn: { backgroundColor: BRAND.primary, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  btnActive: { backgroundColor: '#2563eb' },
  btnText: { color: '#fff', fontWeight: '700' }
});

export default EventDetailScreen;

// =============================================
// src/screens/ProfileScreen.tsx
// =============================================
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthProvider';
import { TEAM_NAME } from '../config/team';

const ProfileScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  return (
    <View style={styles.container}>
      <Text style={styles.h1}>프로필</Text>
      <Text style={styles.p}>팀: {TEAM_NAME}</Text>
      <Text style={styles.p}>이메일: {user?.email}</Text>
      <TouchableOpacity style={styles.btn} onPress={signOut}><Text style={styles.btnText}>로그아웃</Text></TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  h1: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  p: { marginBottom: 8 },
  btn: { backgroundColor: '#111827', padding: 12, borderRadius: 10, alignSelf: 'flex-start' },
  btnText: { color: '#fff', fontWeight: '700' }
});

export default ProfileScreen;

// =============================================
// 🗄️ Supabase 스키마 & RLS (sql/schema.sql)
// — 1팀(PEACH FC) 전용: team_notices 추가, TEAM_ID seed
// =============================================
/*
-- 팀 + 멤버 + 공지 + 일정 + 참석
create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  emblem_url text,
  created_at timestamptz default now()
);

create table if not exists team_members (
  team_id uuid references teams(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text check (role in ('owner','manager','member')) default 'member',
  primary key (team_id, user_id)
);

create table if not exists team_notices (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) on delete cascade,
  title text not null,
  type text check (type in ('match','training','meeting')) default 'training',
  start_at timestamptz not null,
  end_at timestamptz not null,
  place text,
  note text,
  created_at timestamptz default now()
);

create table if not exists event_attendance (
  event_id uuid references events(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  status text check (status in ('yes','no','maybe')) not null default 'maybe',
  comment text,
  primary key (event_id, user_id)
);

-- RLS 활성화
alter table teams enable row level security;
alter table team_members enable row level security;
alter table team_notices enable row level security;
alter table events enable row level security;
alter table event_attendance enable row level security;

-- 정책: 본인이 속한 팀(= PEACH FC)에 한해 읽기
create policy "read_teams_by_members" on teams for select using (
  exists(select 1 from team_members m where m.team_id = id and m.user_id = auth.uid())
);
create policy "read_members_self_team" on team_members for select using (user_id = auth.uid());
create policy "read_notices_by_members" on team_notices for select using (
  exists(select 1 from team_members m where m.team_id = team_notices.team_id and m.user_id = auth.uid())
);
create policy "read_events_by_members" on events for select using (
  exists(select 1 from team_members m where m.team_id = events.team_id and m.user_id = auth.uid())
);
create policy "read_attendance_by_members" on event_attendance for select using (
  auth.uid() = user_id or exists(select 1 from events e join team_members m on m.team_id = e.team_id where e.id = event_id and m.user_id = auth.uid())
);

-- 쓰기 정책(간단): 참석은 본인만, 공지/이벤트는 매니저 이상
create policy "upsert_attendance_self" on event_attendance for insert with check (auth.uid() = user_id);
create policy "update_attendance_self" on event_attendance for update using (auth.uid() = user_id);

create policy "insert_events_managers" on events for insert with check (
  exists(select 1 from team_members m where m.team_id = events.team_id and m.user_id = auth.uid() and m.role in ('owner','manager'))
);
create policy "insert_notice_managers" on team_notices for insert with check (
  exists(select 1 from team_members m where m.team_id = team_notices.team_id and m.user_id = auth.uid() and m.role in ('owner','manager'))
);

-- 🔻 PEACH FC 팀 생성(시드) 후 TEAM_ID를 복사해 앱에 반영하세요
-- insert into teams(name) values ('PEACH FC') returning id;  ← 이 값이 TEAM_ID
-- 예시: insert into team_members(team_id, user_id, role) values ('<TEAM_ID>', auth.uid(), 'owner');
-- 예시 일정:
-- insert into events(team_id, title, type, start_at, end_at, place, note)
-- values ('<TEAM_ID>', '주말 풋살', 'training', now() + interval '3 days', now() + interval '3 days 2 hours', '○○풋살장', '운동 후 치맥');
-- 공지:
-- insert into team_notices(team_id, content) values ('<TEAM_ID>', '신입 회원 환영합니다!');
*/

// =============================================
// 📘 설치 & 실행 가이드 (README.md 발췌)
// =============================================
/*
1) Expo 프로젝트 생성
   npx create-expo-app@latest peach-fc-app --template blank-typescript
   cd peach-fc-app

2) 의존성 설치
   npm i @supabase/supabase-js @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs \
     @react-native-async-storage/async-storage react-native-screens react-native-safe-area-context react-native-gesture-handler

3) 위 소스코드를 동일 구조로 파일 생성
   - index.js, src/**/*, app.json, package.json, .gitignore 등

4) Supabase 설정
   - 프로젝트 생성 → Auth 이메일 로그인 활성화
   - SQL Editor에 schema.sql 실행 → "PEACH FC" insert로 id 받기 → src/config/team.ts의 TEAM_ID 교체
   - Settings → API의 URL/Anon key를 .env 또는 EXPO_PUBLIC_*에 입력

5) 실행
   npm run start
   (Expo Go 또는 에뮬레이터)
*/

// =============================================
// 📦 sql/seed_peachfc.sql — PEACH FC 초기 시드 스크립트
// ---------------------------------------------
// 실행 위치: Supabase 프로젝트의 SQL Editor
// 사용 방법: 아래 ①~③ 중에서 "일괄 시드(권장)"를 그대로 실행하세요.
// =============================================

-- ① 일괄 시드 (권장): 팀 생성 + 오너 초대 + 공지/일정 샘플까지 한 번에
-- ※ 아래 이메일을 실제 오너 이메일로 교체하세요!
--    (해당 이메일 계정이 Supabase Auth > Users에 존재해야 합니다. 없다면 앱에서 한 번 로그인해 생성을 유도하세요.)

do $$
declare
  v_team uuid;
  v_owner uuid;
  v_now  timestamptz := timezone('Asia/Seoul', now());
begin
  -- 팀 생성 (중복 생성 방지: 이미 있으면 기존 id 사용)
  select id into v_team from teams where name = 'PEACH FC';
  if v_team is null then
    insert into teams(name) values ('PEACH FC') returning id into v_team;
  end if;

  -- 오너 사용자 id 찾기 (이메일 교체 필요)
  select id into v_owner from auth.users where email = 'owner@example.com'; -- ← 여기 수정!
  if v_owner is null then
    raise exception 'Auth 사용자(%%)를 찾을 수 없습니다. 먼저 앱에서 해당 이메일로 로그인 하세요.', 'owner@example.com';
  end if;

  -- 멤버십 upsert (오너 권한 부여)
  insert into team_members(team_id, user_id, role)
  values (v_team, v_owner, 'owner')
  on conflict (team_id, user_id) do update set role = excluded.role;

  -- 공지 샘플 1개
  insert into team_notices(team_id, content)
  values (v_team, '신입 회원 환영합니다! 이번 주말 풋살은 정상 진행합니다 🧡')
  on conflict do nothing;

  -- 일정 샘플 2개
  insert into events(team_id, title, type, start_at, end_at, place, note)
  values
    (v_team, '주말 풋살 (기본 체력훈련)', 'training', v_now + interval '3 days 10:00:00', v_now + interval '3 days 12:00:00', '○○ 풋살장 A코트', '물 충분히!'),
    (v_team, '연습경기 vs 동네FC', 'match', v_now + interval '10 days 19:00:00', v_now + interval '10 days 21:00:00', '△△ 운동장', '유니폼 주황 상/검정 하');

  raise notice '✅ PEACH FC 시드 완료! team_id= %', v_team;
end $$;

-- ② 팀 ID만 따로 확인하고 싶다면
-- select id from teams where name = 'PEACH FC';

-- ③ 특정 사용자를 매니저/멤버로 추가 (이메일로)
-- 아래 한 줄씩 복사 실행. 이메일만 교체하세요.
-- insert into team_members(team_id, user_id, role)
-- select (select id from teams where name='PEACH FC'), id, 'manager'
-- from auth.users where email='manager@example.com'
-- on conflict (team_id, user_id) do update set role = excluded.role;

-- ④ (선택) 간편 함수: 이메일로 멤버 추가 — 실행 후 바로 drop 해도 됨
-- security definer로 auth.users 접근. 운영에선 관리자만 사용 권장.
-- create or replace function app_add_member_by_email(p_team uuid, p_email text, p_role text default 'member')
-- returns void language plpgsql security definer set search_path = public as $$
-- declare uid uuid; begin
--   select id into uid from auth.users where email = p_email;
--   if uid is null then raise exception 'No user with email %', p_email; end if;
--   insert into team_members(team_id, user_id, role)
--   values (p_team, uid, p_role)
--   on conflict (team_id, user_id) do update set role = excluded.role;
-- end $$;
-- grant execute on function app_add_member_by_email(uuid, text, text) to authenticated;
-- 사용 예) select app_add_member_by_email((select id from teams where name='PEACH FC'), 'member1@example.com', 'member');
-- 필요 없으면: drop function if exists app_add_member_by_email(uuid, text, text);

-- ✅ 실행 후 앱 코드의 src/config/team.ts → TEAM_ID를 ②로 확인한 값으로 교체하세요!

