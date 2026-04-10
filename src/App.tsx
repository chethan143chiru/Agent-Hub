import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Trophy, 
  Wand2, 
  Menu, 
  X,
  ChevronRight,
  Sparkles,
  Search,
  Cpu,
  Share2,
  Copy,
  Check,
  Send,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { agents, Agent } from '@/lib/agents';
import { generateAgentResponse, generateQuiz, generateAppPlan } from '@/lib/gemini';

// --- Types ---
type View = 'dashboard' | 'chat' | 'quiz' | 'builder' | 'leaderboard';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface Score {
  name: string;
  topic: string;
  score: number;
  total: number;
  date: string;
}

// --- Components ---

const Sidebar = ({ currentView, setView, isOpen, toggle }: { currentView: View, setView: (v: View) => void, isOpen: boolean, toggle: () => void }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Agent Hub', icon: LayoutDashboard },
    { id: 'quiz', label: 'Quiz Creator', icon: Sparkles },
    { id: 'builder', label: 'App Builder', icon: Wand2 },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  ];

  return (
    <>
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-zinc-950 border-r border-zinc-800 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="flex flex-col h-full">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                <Cpu className="text-white w-6 h-6" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white">AI Hub</h1>
            </div>
            
            <nav className="space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setView(item.id as View); if (window.innerWidth < 768) toggle(); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    currentView === item.id 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
          
          <div className="mt-auto p-6 border-t border-zinc-800">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 border border-zinc-700">
                <AvatarImage src="https://picsum.photos/seed/user/100" />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">Guest User</p>
                <p className="text-xs text-zinc-500 truncate">Free Tier</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={toggle}
        />
      )}
    </>
  );
};

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Quiz State
  const [quizTopic, setQuizTopic] = useState('');
  const [currentQuiz, setCurrentQuiz] = useState<QuizQuestion[] | null>(null);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  // App Builder State
  const [appIdea, setAppIdea] = useState('');
  const [appPlan, setAppPlan] = useState('');

  // Leaderboard State
  const [leaderboard, setLeaderboard] = useState<Score[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('ai-hub-leaderboard');
    if (saved) setLeaderboard(JSON.parse(saved));
  }, []);

  const saveScore = (topic: string, score: number, total: number) => {
    const newScore: Score = {
      name: 'Guest User',
      topic,
      score,
      total,
      date: new Date().toLocaleDateString(),
    };
    const updated = [newScore, ...leaderboard].slice(0, 50);
    setLeaderboard(updated);
    localStorage.setItem('ai-hub-leaderboard', JSON.stringify(updated));
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !selectedAgent) return;
    
    const userMsg = input;
    setInput('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    const history = chatHistory.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));

    const response = await generateAgentResponse(selectedAgent.systemPrompt, userMsg, history);
    setChatHistory(prev => [...prev, { role: 'assistant', content: response }]);
    setIsLoading(false);
  };

  const startQuiz = async () => {
    if (!quizTopic.trim()) return;
    setIsLoading(true);
    const quiz = await generateQuiz(quizTopic);
    if (quiz) {
      setCurrentQuiz(quiz);
      setQuizIndex(0);
      setQuizScore(0);
      setQuizFinished(false);
    } else {
      toast.error("Failed to generate quiz. Try a different topic.");
    }
    setIsLoading(false);
  };

  const handleQuizAnswer = (index: number) => {
    if (!currentQuiz) return;
    const isCorrect = index === currentQuiz[quizIndex].correctAnswer;
    
    if (isCorrect) {
      setQuizScore(prev => prev + 1);
      toast.success("Correct!");
    } else {
      toast.error(`Wrong! The correct answer was: ${currentQuiz[quizIndex].options[currentQuiz[quizIndex].correctAnswer]}`);
    }

    if (quizIndex + 1 < currentQuiz.length) {
      setQuizIndex(prev => prev + 1);
    } else {
      setQuizFinished(true);
      const finalScore = quizScore + (isCorrect ? 1 : 0);
      saveScore(quizTopic, finalScore, currentQuiz.length);
    }
  };

  const buildApp = async () => {
    if (!appIdea.trim()) return;
    setIsLoading(true);
    const plan = await generateAppPlan(appIdea);
    setAppPlan(plan);
    setIsLoading(false);
  };

  const shareContent = (title: string, text: string) => {
    if (navigator.share) {
      navigator.share({ title, text, url: window.location.href })
        .catch(() => {
          navigator.clipboard.writeText(text);
          toast.success("Link copied to clipboard!");
        });
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Link copied to clipboard!");
    }
  };

  const filteredAgents = agents.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    a.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/30">
      <Toaster position="top-center" richColors />
      
      <Sidebar 
        currentView={view} 
        setView={(v) => { setView(v); setSelectedAgent(null); }} 
        isOpen={isSidebarOpen} 
        toggle={() => setIsSidebarOpen(!isSidebarOpen)} 
      />

      <main className="md:ml-64 min-h-screen flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsSidebarOpen(true)}>
              <Menu className="w-6 h-6" />
            </Button>
            <h2 className="text-lg font-semibold capitalize">
              {view === 'dashboard' ? 'Agent Hub' : view.replace('-', ' ')}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-3 py-1">
              <Sparkles className="w-3 h-3 mr-1" /> AI Online
            </Badge>
          </div>
        </header>

        <div className="p-6 flex-1 max-w-7xl mx-auto w-full">
          <AnimatePresence mode="wait">
            {view === 'dashboard' && !selectedAgent && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
                  <Input 
                    placeholder="Search specialized agents..." 
                    className="pl-12 h-14 bg-zinc-900/50 border-zinc-800 text-lg rounded-2xl focus:ring-emerald-500/50"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredAgents.map((agent) => (
                    <motion.div
                      key={agent.id}
                      whileHover={{ y: -5 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => { setSelectedAgent(agent); setView('chat'); setChatHistory([]); }}
                    >
                      <Card className="h-full bg-zinc-900/50 border-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-900 transition-all cursor-pointer group">
                        <CardHeader>
                          <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 group-hover:text-emerald-400 transition-colors">
                            <agent.icon className="w-6 h-6" />
                          </div>
                          <CardTitle className="text-lg text-white">{agent.name}</CardTitle>
                          <CardDescription className="text-zinc-400 line-clamp-2">{agent.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {agent.tasks.slice(0, 2).map(task => (
                              <Badge key={task} variant="secondary" className="bg-zinc-800 text-zinc-400 text-[10px] font-normal">
                                {task}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {view === 'chat' && selectedAgent && (
              <motion.div
                key="chat"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col h-full max-h-[calc(100vh-12rem)]"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => setSelectedAgent(null)}>
                      <ChevronRight className="w-6 h-6 rotate-180" />
                    </Button>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <selectedAgent.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white">{selectedAgent.name}</h3>
                        <p className="text-xs text-zinc-500">{selectedAgent.role}</p>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="icon" onClick={() => shareContent('AI Chat', chatHistory.map(m => `${m.role}: ${m.content}`).join('\n'))}>
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>

                <Card className="flex-1 flex flex-col bg-zinc-900/50 border-zinc-800 overflow-hidden rounded-2xl">
                  <ScrollArea className="flex-1 p-6">
                    <div className="space-y-6">
                      {chatHistory.length === 0 && (
                        <div className="text-center py-12 space-y-4">
                          <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto">
                            <MessageSquare className="w-8 h-8 text-zinc-500" />
                          </div>
                          <div className="max-w-md mx-auto">
                            <h4 className="text-lg font-medium text-white">Start a conversation</h4>
                            <p className="text-zinc-500 text-sm">Ask {selectedAgent.name} anything about its specialized role.</p>
                          </div>
                        </div>
                      )}
                      {chatHistory.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                            msg.role === 'user' 
                              ? 'bg-emerald-600 text-white rounded-tr-none' 
                              : 'bg-zinc-800 text-zinc-200 rounded-tl-none'
                          }`}>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          </div>
                        </div>
                      ))}
                      {isLoading && (
                        <div className="flex justify-start">
                          <div className="bg-zinc-800 px-4 py-3 rounded-2xl rounded-tl-none">
                            <div className="flex gap-1">
                              <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" />
                              <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                              <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                  
                  <div className="p-4 bg-zinc-900 border-t border-zinc-800">
                    <form 
                      onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                      className="flex gap-2"
                    >
                      <Input 
                        placeholder={`Message ${selectedAgent.name}...`}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="bg-zinc-800 border-zinc-700 focus:ring-emerald-500/50"
                        disabled={isLoading}
                      />
                      <Button type="submit" disabled={isLoading || !input.trim()} className="bg-emerald-600 hover:bg-emerald-500">
                        <Send className="w-4 h-4" />
                      </Button>
                    </form>
                  </div>
                </Card>
              </motion.div>
            )}

            {view === 'quiz' && (
              <motion.div
                key="quiz"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-2xl mx-auto space-y-8 w-full"
              >
                {!currentQuiz ? (
                  <Card className="bg-zinc-900/50 border-zinc-800 p-8 text-center space-y-6 rounded-3xl">
                    <div className="w-20 h-20 bg-emerald-500/20 rounded-3xl flex items-center justify-center mx-auto text-emerald-400">
                      <Sparkles className="w-10 h-10" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-bold text-white">AI Quiz Creator</h3>
                      <p className="text-zinc-400">Generate a custom quiz on any topic instantly.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input 
                        placeholder="Enter topic (e.g. Quantum Physics, 80s Pop...)" 
                        value={quizTopic}
                        onChange={(e) => setQuizTopic(e.target.value)}
                        className="bg-zinc-800 border-zinc-700 h-12"
                      />
                      <Button onClick={startQuiz} disabled={isLoading || !quizTopic.trim()} className="h-12 px-8 bg-emerald-600 hover:bg-emerald-500">
                        {isLoading ? 'Generating...' : 'Create Quiz'}
                      </Button>
                    </div>
                  </Card>
                ) : quizFinished ? (
                  <Card className="bg-zinc-900/50 border-zinc-800 p-12 text-center space-y-8 rounded-3xl">
                    <div className="space-y-4">
                      <div className="text-6xl font-black text-emerald-400">{quizScore} / {currentQuiz.length}</div>
                      <h3 className="text-2xl font-bold text-white">Quiz Completed!</h3>
                      <p className="text-zinc-400">Great job! Your score has been added to the leaderboard.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                      <Button variant="outline" onClick={() => setCurrentQuiz(null)} className="border-zinc-700 hover:bg-zinc-800">
                        <RotateCcw className="w-4 h-4 mr-2" /> New Quiz
                      </Button>
                      <Button onClick={() => shareContent('My Quiz Score', `I scored ${quizScore}/${currentQuiz.length} on a ${quizTopic} quiz!`)} className="bg-zinc-800 hover:bg-zinc-700">
                        <Share2 className="w-4 h-4 mr-2" /> Share Result
                      </Button>
                      <Button onClick={() => setView('leaderboard')} className="bg-emerald-600 hover:bg-emerald-500">
                        View Leaderboard
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <Badge variant="secondary" className="bg-zinc-800 text-zinc-400">
                        Question {quizIndex + 1} of {currentQuiz.length}
                      </Badge>
                      <div className="text-sm text-zinc-500">Topic: {quizTopic}</div>
                    </div>
                    
                    <Card className="bg-zinc-900/50 border-zinc-800 p-8 rounded-3xl">
                      <h3 className="text-xl font-semibold text-white mb-8">{currentQuiz[quizIndex].question}</h3>
                      <div className="grid grid-cols-1 gap-3">
                        {currentQuiz[quizIndex].options.map((option, i) => (
                          <Button 
                            key={i}
                            variant="outline"
                            className="justify-start h-auto min-h-[3.5rem] py-3 px-6 text-left border-zinc-800 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-zinc-300"
                            onClick={() => handleQuizAnswer(i)}
                          >
                            <span className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center mr-4 text-xs font-bold text-zinc-500 flex-shrink-0">
                              {String.fromCharCode(65 + i)}
                            </span>
                            <span className="flex-1">{option}</span>
                          </Button>
                        ))}
                      </div>
                    </Card>
                  </div>
                )}
              </motion.div>
            )}

            {view === 'builder' && (
              <motion.div
                key="builder"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-4xl mx-auto space-y-8 w-full"
              >
                <div className="text-center space-y-4">
                  <h3 className="text-3xl font-bold text-white">AI App Builder</h3>
                  <p className="text-zinc-400 max-w-xl mx-auto">Describe your dream application and let our AI architect design the blueprint for you.</p>
                </div>

                <Card className="bg-zinc-900/50 border-zinc-800 p-6 rounded-3xl">
                  <div className="space-y-4">
                    <textarea 
                      placeholder="e.g. A fitness app that tracks calories using photos of food..."
                      className="w-full h-32 bg-zinc-800 border border-zinc-700 rounded-2xl p-4 text-zinc-100 focus:ring-2 focus:ring-emerald-500/50 outline-none resize-none"
                      value={appIdea}
                      onChange={(e) => setAppIdea(e.target.value)}
                    />
                    <Button 
                      onClick={buildApp} 
                      disabled={isLoading || !appIdea.trim()} 
                      className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-lg font-semibold"
                    >
                      {isLoading ? 'Designing Blueprint...' : 'Generate App Blueprint'}
                    </Button>
                  </div>
                </Card>

                {appPlan && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl relative group"
                  >
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="outline" size="icon" onClick={() => shareContent('App Blueprint', appPlan)}>
                        <Share2 className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(appPlan); toast.success("Copied!"); }}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="prose prose-invert max-w-none prose-emerald">
                      <ReactMarkdown>{appPlan}</ReactMarkdown>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {view === 'leaderboard' && (
              <motion.div
                key="leaderboard"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="max-w-3xl mx-auto space-y-8 w-full"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-white">Global Leaderboard</h3>
                  <Trophy className="w-8 h-8 text-yellow-500" />
                </div>

                <Card className="bg-zinc-900/50 border-zinc-800 overflow-hidden rounded-3xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-zinc-900 border-b border-zinc-800">
                          <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Rank</th>
                          <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">User</th>
                          <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Topic</th>
                          <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Score</th>
                          <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800">
                        {leaderboard.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">No scores yet. Take a quiz to appear here!</td>
                          </tr>
                        ) : (
                          leaderboard.map((score, i) => (
                            <tr key={i} className="hover:bg-zinc-800/50 transition-colors">
                              <td className="px-6 py-4">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                  i === 0 ? 'bg-yellow-500 text-black' : 
                                  i === 1 ? 'bg-zinc-300 text-black' : 
                                  i === 2 ? 'bg-amber-600 text-white' : 'text-zinc-500'
                                }`}>
                                  {i + 1}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-medium text-white">{score.name}</td>
                              <td className="px-6 py-4 text-zinc-400 capitalize">{score.topic}</td>
                              <td className="px-6 py-4">
                                <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
                                  {score.score} / {score.total}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 text-zinc-500 text-sm">{score.date}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Menu Button */}
      {!isSidebarOpen && (
        <Button 
          variant="secondary" 
          size="icon" 
          className="fixed bottom-6 right-6 md:hidden rounded-full w-14 h-14 shadow-xl bg-emerald-600 hover:bg-emerald-500 text-white"
          onClick={() => setIsSidebarOpen(true)}
        >
          <Menu className="w-6 h-6" />
        </Button>
      )}
    </div>
  );
}
