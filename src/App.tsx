import React, { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signOut as firebaseSignOut,
  User
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  Timestamp,
  addDoc
} from 'firebase/firestore';
import { auth, db, signIn } from './lib/firebase';
import { UserProfile, HealthMetric, Consultation } from './types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Heart, 
  Activity, 
  Moon, 
  Scale, 
  Calendar, 
  MessageSquare, 
  Stethoscope, 
  User as UserIcon, 
  LogOut, 
  Plus, 
  Bot,
  ChevronRight,
  TrendingUp,
  Brain
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import ReactMarkdown from 'react-markdown';
import { aiDoctor } from './services/geminiService';

// --- Auth Component ---
const AuthScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-6">
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md w-full text-center space-y-8"
    >
      <div className="space-y-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-blue-600 text-white shadow-xl shadow-blue-200">
          <Activity size={40} strokeWidth={2.5} />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900">VitalSource</h1>
        <p className="text-zinc-500 font-medium tracking-tight">Enterprise Health Intelligence Platform</p>
      </div>
      
      <Card className="border-none shadow-2xl shadow-zinc-200/50 bg-white/80 backdrop-blur-xl">
        <CardHeader>
          <CardTitle>Welcome to VitalSource</CardTitle>
          <CardDescription>Securely access your health data and connect with medical experts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={signIn}
            className="w-full h-12 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl transition-all"
          >
            Sign in with Google
          </Button>
          <p className="text-xs text-zinc-400">By continuing, you agree to our HIPPA-compliant Privacy Policy and Terms of Service.</p>
        </CardContent>
      </Card>
    </motion.div>
  </div>
);

// --- Patient Dashboard ---
const PatientDashboard = ({ profile }: { profile: UserProfile }) => {
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [recentConsultations, setRecentConsultations] = useState<Consultation[]>([]);
  const [aiChat, setAIChat] = useState<{role: 'user' | 'bot', text: string}[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!profile.uid) return;
    
    // Listen for health metrics
    const qMarkers = query(
      collection(db, 'health_metrics'),
      where('userId', '==', profile.uid),
      orderBy('timestamp', 'desc'),
      limit(20)
    );
    
    const unsubMetrics = onSnapshot(qMarkers, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as HealthMetric));
      setMetrics(data.reverse());
    });

    return () => unsubMetrics();
  }, [profile.uid]);

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    const userMsg = inputMessage;
    setAIChat(prev => [...prev, { role: 'user', text: userMsg }]);
    setInputMessage('');
    setIsTyping(true);

    const response = await aiDoctor(metrics, userMsg);
    setAIChat(prev => [...prev, { role: 'bot', text: response }]);
    setIsTyping(false);
  };

  const addMetric = async (type: HealthMetric['type'], value: number, unit: string) => {
    try {
      await addDoc(collection(db, 'health_metrics'), {
        userId: profile.uid,
        type,
        value,
        unit,
        timestamp: Timestamp.now()
      });
    } catch (e) {
      console.error(e);
    }
  };

  const currentHeartRate = metrics.filter(m => m.type === 'heart_rate').slice(-1)[0]?.value || '--';
  const currentSteps = metrics.filter(m => m.type === 'steps').reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column: Stats & Charts */}
      <div className="lg:col-span-2 space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900">Good Morning, {profile.displayName.split(' ')[0]}</h2>
            <p className="text-zinc-500">Here's your health overview for today.</p>
          </div>
          <Button variant="outline" size="sm" className="rounded-xl border-dashed">
            <Plus size={16} className="mr-2" /> Daily Log
          </Button>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-rose-50 text-rose-500 rounded-lg"><Heart size={20} /></div>
                <Badge variant="secondary" className="bg-rose-50 text-rose-600 border-none font-medium text-[10px]">NORMAL</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-zinc-500">Heart Rate</p>
                <div className="flex items-baseline gap-1">
                  <h3 className="text-2xl font-bold text-zinc-900">{currentHeartRate}</h3>
                  <span className="text-xs text-zinc-400 font-medium">BPM</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-50 text-blue-500 rounded-lg"><Activity size={20} /></div>
                <TrendingUp size={16} className="text-zinc-400" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-zinc-500">Total Steps</p>
                <div className="flex items-baseline gap-1">
                  <h3 className="text-2xl font-bold text-zinc-900">{currentSteps}</h3>
                  <span className="text-xs text-zinc-400 font-medium">Steps</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-indigo-50 text-indigo-500 rounded-lg"><Moon size={20} /></div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-zinc-500">Sleep Duration</p>
                <div className="flex items-baseline gap-1">
                  <h3 className="text-2xl font-bold text-zinc-900">7.2</h3>
                  <span className="text-xs text-zinc-400 font-medium">Hours</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-amber-50 text-amber-500 rounded-lg"><Scale size={20} /></div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-zinc-500">Weight</p>
                <div className="flex items-baseline gap-1">
                  <h3 className="text-2xl font-bold text-zinc-900">72.4</h3>
                  <span className="text-xs text-zinc-400 font-medium">kg</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-0.5">
              <CardTitle className="text-lg">Vital Metrics Trend</CardTitle>
              <CardDescription>Your activity and vital trends over the last 24 hours.</CardDescription>
            </div>
            <Tabs defaultValue="activity" className="w-[200px]">
              <TabsList className="grid w-full grid-cols-2 rounded-xl h-8 bg-zinc-100">
                <TabsTrigger value="activity" className="text-xs rounded-lg">Activity</TabsTrigger>
                <TabsTrigger value="vitals" className="text-xs rounded-lg">Vitals</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="pt-4 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(val) => val?.seconds ? new Date(val.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#a1a1aa' }}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  labelFormatter={(val) => val?.seconds ? new Date(val.seconds * 1000).toLocaleString() : ''}
                />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-zinc-900">Recommended for You</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-600 rounded-2xl text-white flex items-center justify-between group cursor-pointer hover:bg-blue-700 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                   <Brain size={24} />
                </div>
                <div>
                  <h4 className="font-semibold">AI Symptom Analysis</h4>
                  <p className="text-xs text-blue-100">Check your symptoms with VitalAI</p>
                </div>
              </div>
              <ChevronRight className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="p-4 bg-zinc-900 rounded-2xl text-white flex items-center justify-between group cursor-pointer hover:bg-zinc-800 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md">
                   <Stethoscope size={24} />
                </div>
                <div>
                  <h4 className="font-semibold">Consult a Doctor</h4>
                  <p className="text-xs text-zinc-400">Available specialists waiting</p>
                </div>
              </div>
              <ChevronRight className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </section>
      </div>

      {/* Right Column: AI Assistant Chat */}
      <div className="space-y-6">
        <Card className="border-none shadow-sm flex flex-col h-[calc(100vh-200px)] sticky top-8">
          <CardHeader className="border-b bg-zinc-50/50 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <Bot size={22} />
              </div>
              <div>
                <CardTitle className="text-md">VitalAI Assistant</CardTitle>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Online & Analyzing</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full px-4 pt-4">
              <div className="space-y-4 pb-4">
                {aiChat.length === 0 && (
                  <div className="text-center py-8 space-y-2">
                    <p className="text-sm text-zinc-400">Ready to help you understand your health trends.</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <Button variant="secondary" size="xs" onClick={() => setInputMessage("Analyze my heart rate trends.")} className="text-[10px] h-7 rounded-full px-3">"Analyze heart rate"</Button>
                      <Button variant="secondary" size="xs" onClick={() => setInputMessage("Am I getting enough sleep?")} className="text-[10px] h-7 rounded-full px-3">"Check sleep"</Button>
                    </div>
                  </div>
                )}
                {aiChat.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                      msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-tr-none' 
                        : 'bg-zinc-100 text-zinc-800 rounded-tl-none'
                    }`}>
                      <div className="prose prose-sm prose-invert max-w-none text-inherit">
                        <ReactMarkdown>
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-zinc-50 border px-4 py-2 rounded-2xl rounded-tl-none flex gap-1">
                      <span className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
          <div className="p-4 border-t bg-white">
            <div className="flex gap-2">
              <Input 
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Ask VitalAI about your health..."
                className="rounded-xl h-11 border-zinc-200 bg-zinc-50/50"
              />
              <Button size="icon" className="h-11 w-11 rounded-xl bg-blue-600 shadow-lg shadow-blue-200 hover:bg-blue-700" onClick={sendMessage}>
                <ChevronRight size={20} />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

// --- Doctor Dashboard ---
const DoctorDashboard = ({ profile }: { profile: UserProfile }) => {
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900">Dr. {profile.displayName.split(' ').slice(-1)[0]}</h2>
            <Badge className="bg-blue-50 text-blue-600 border-none font-semibold px-2 h-6">{profile.specialty || 'General Practitioner'}</Badge>
          </div>
          <p className="text-zinc-500">Managing 12 upcoming consultations today.</p>
        </div>
        <div className="flex items-center gap-3">
           <Button variant="outline" className="rounded-xl"><Calendar size={18} className="mr-2" /> Schedule</Button>
           <Button className="rounded-xl bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-200">Start Session</Button>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Upcoming Consultations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1,2,3].map(i => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 border border-zinc-100 hover:border-blue-200 transition-all cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12 rounded-xl border-2 border-white shadow-sm">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} />
                        <AvatarFallback>PN</AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-semibold text-zinc-900">Patient Case #{1000 + i}</h4>
                        <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
                          <span className="flex items-center gap-1"><Calendar size={12} /> 10:30 AM</span>
                          <span className="flex items-center gap-1"><Activity size={12} /> Routine Checkup</span>
                        </div>
                      </div>
                    </div>
                    <Button size="sm" variant="secondary" className="rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">Review Vitals</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>System Alerts</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 flex items-start gap-4">
                 <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0">
                    <Heart size={20} />
                 </div>
                 <div>
                   <h5 className="font-semibold text-rose-900">Critical: Arrhythmia Detected</h5>
                   <p className="text-xs text-rose-700/80 mt-1">Patient ID #4521 reported abnormal heart rhythm 10 mins ago via remote sensor.</p>
                 </div>
               </div>
               <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex items-start gap-4">
                 <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                    <Brain size={20} />
                 </div>
                 <div>
                   <h5 className="font-semibold text-amber-900">AI Triage Recommendation</h5>
                   <p className="text-xs text-amber-700/80 mt-1">Patient #2201 symptoms suggest early onset hypertension based on 3-day data.</p>
                 </div>
               </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-sm bg-zinc-900 text-white">
            <CardHeader>
              <CardTitle className="text-inherit">Vital Insights</CardTitle>
              <CardDescription className="text-zinc-400">Aggregated patient performance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-zinc-400 uppercase tracking-wider">Patient Recovery Rate</span>
                  <span className="text-green-400">88%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: '88%' }} className="h-full bg-green-500" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-zinc-400 uppercase tracking-wider">AI Diagnosis Accuracy</span>
                  <span className="text-blue-400">94.2%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: '94.2%' }} className="h-full bg-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Medical Feed</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm font-medium p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                New clinical study on GLP-1 agonists published in NEJM.
              </div>
              <div className="text-sm font-medium p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                Updated CDC guidelines for remote patient monitoring.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Fetch or create profile
        const docRef = doc(db, 'users', u.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        } else {
          // New User - Default to patient
          const newProfile: UserProfile = {
            uid: u.uid,
            email: u.email || '',
            displayName: u.displayName || 'Guest User',
            photoURL: u.photoURL || '',
            role: 'patient'
          };
          await setDoc(docRef, newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSignOut = () => firebaseSignOut(auth);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="p-4 bg-white rounded-3xl shadow-xl">
           <Activity size={32} className="text-blue-600" />
        </motion.div>
      </div>
    );
  }

  if (!user || !profile) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-zinc-200/50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
              <Activity size={18} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900">VitalSource</h1>
          </div>
          
          <div className="hidden md:flex items-center gap-1 px-4">
            <Button variant="ghost" className="text-sm rounded-xl text-zinc-600 hover:text-zinc-900 active:bg-zinc-100">Dashboard</Button>
            <Button variant="ghost" className="text-sm rounded-xl text-zinc-600 hover:text-zinc-900">Patients</Button>
            <Button variant="ghost" className="text-sm rounded-xl text-zinc-600 hover:text-zinc-900">Medical History</Button>
            <Button variant="ghost" className="text-sm rounded-xl text-zinc-600 hover:text-zinc-900">Settings</Button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 px-3 py-1.5 bg-zinc-50 rounded-2xl border border-zinc-100">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-zinc-900 leading-tight">{profile.displayName}</p>
                <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-tighter">{profile.role}</p>
              </div>
              <Avatar className="h-8 w-8 rounded-xl border border-white shadow-sm">
                <AvatarImage src={profile.photoURL} />
                <AvatarFallback>{profile.displayName[0]}</AvatarFallback>
              </Avatar>
            </div>
            <Button variant="ghost" size="icon" onClick={handleSignOut} className="rounded-xl text-zinc-400 hover:text-rose-500 hover:bg-rose-50">
              <LogOut size={18} />
            </Button>
          </div>
        </div>
      </nav>

      <main className="flex-1 bg-zinc-50/50">
        <AnimatePresence mode="wait">
          <motion.div
            key={profile.role}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            {profile.role === 'patient' ? <PatientDashboard profile={profile} /> : <DoctorDashboard profile={profile} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="bg-white border-t py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 grayscale group-hover:grayscale-0 transition-all opacity-40">
            <Activity size={20} />
            <span className="font-bold tracking-tight">VitalSource Intelligence</span>
          </div>
          <p className="text-xs text-zinc-400 font-medium tracking-tight">© 2026 VitalSource Health. All medical data is encrypted with AES-256 GCM.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors uppercase tracking-widest font-bold">Privacy</a>
            <a href="#" className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors uppercase tracking-widest font-bold">API Docs</a>
            <a href="#" className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors uppercase tracking-widest font-bold">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
