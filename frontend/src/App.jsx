import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Loader2, Download, Copy, Check, AlertCircle, FileText, Code, 
  Settings, Menu, X, Save, Trash2, Play, ChevronRight, Zap, Shield, Clock,
  User, LogOut, Folder, Plus, Edit2
} from 'lucide-react';
import { generateTestCases, generateScript, exportCSV } from './services/api';
import { useAuth } from './context/AuthContext';
import LoginForm from './components/Auth/LoginForm';
import SignupForm from './components/Auth/SignupForm';
import axios from 'axios';

// ─── Inline Editable Field Component ───────────────────────────────────────
function EditableField({ value, onSave, multiline = false, className = '', inputClassName = '' }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const handleBlur = () => {
    setEditing(false);
    if (draft.trim() !== value) onSave(draft.trim());
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !multiline) { e.preventDefault(); handleBlur(); }
    if (e.key === 'Escape') { setDraft(value); setEditing(false); }
  };

  if (editing) {
    return multiline ? (
      <textarea
        autoFocus
        value={draft}
        rows={3}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={inputClassName}
      />
    ) : (
      <input
        autoFocus
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={inputClassName}
      />
    );
  }

  return (
    <span
      onClick={() => { setDraft(value); setEditing(true); }}
      className={`${className} cursor-pointer hover:bg-indigo-50 hover:outline hover:outline-1 hover:outline-indigo-200 rounded px-1 -mx-1 transition-all group relative`}
      title="Click to edit"
    >
      {value}
      <Edit2 size={12} className="inline ml-1 text-indigo-300 group-hover:text-indigo-500 transition-colors" />
    </span>
  );
}

function App() {
  // Auth state
  const { isAuthenticated, loading: authLoading, logout, user } = useAuth();
  const [authView, setAuthView] = useState('login');
  
  // Existing state
  const [requirement, setRequirement] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [testCases, setTestCases] = useState([]);
  const [selectedTestCase, setSelectedTestCase] = useState(null);
  const [language, setLanguage] = useState('Python');
  const [framework, setFramework] = useState('Selenium');
  const [generatedScript, setGeneratedScript] = useState('');
  const [loading, setLoading] = useState(false);
  const [scriptLoading, setScriptLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('input');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // F08: Gherkin state
  const [gherkinMode, setGherkinMode] = useState(false);
  const [featureName, setFeatureName] = useState('');
  const [includeOutline, setIncludeOutline] = useState(false);
  const [gherkinOutput, setGherkinOutput] = useState('');
  const [gherkinLoading, setGherkinLoading] = useState(false);
  const [gherkinCopied, setGherkinCopied] = useState(false);

  // Project state
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);

  const sampleRequirements = [
    {
      title: "User Authentication",
      description: "As a user, I want to log in to the application using my email and password so that I can access my dashboard.",
      category: "Security"
    },
    {
      title: "Shopping Cart",
      description: "As a customer, I want to add items to my shopping cart so that I can purchase multiple products at once.",
      category: "E-commerce"
    },
    {
      title: "User Management",
      description: "As an admin, I want to create and manage user accounts so that I can control system access.",
      category: "Admin"
    }
  ];

  useEffect(() => {
    if (isAuthenticated) {
      loadProjects();
    }
  }, [isAuthenticated]);

  const loadProjects = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/projects/');
      setProjects(response.data);
      if (response.data.length > 0 && !currentProject) {
        setCurrentProject(response.data[0]);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    try {
      const response = await axios.post('http://localhost:8000/api/projects/', {
        name: newProjectName,
        description: newProjectDescription
      });
      setProjects([...projects, response.data]);
      setCurrentProject(response.data);
      setShowNewProjectModal(false);
      setNewProjectName('');
      setNewProjectDescription('');
    } catch (err) {
      setError('Failed to create project');
    }
  };

  const handleSaveTestCaseToProject = async (testCase) => {
    if (!currentProject) {
      setError('Please select a project first');
      return;
    }
    try {
      await axios.post('http://localhost:8000/api/projects/test-cases', {
        project_id: currentProject.id,
        test_case: testCase
      });
      setError('');
      alert('Test case saved to project!');
    } catch (err) {
      setError('Failed to save test case');
    }
  };

  // ── F08: Generate BDD Gherkin ────────────────────────────────────────────────
  const handleGenerateGherkin = async () => {
    if (!requirement.trim()) {
      setError('Please enter a requirement');
      return;
    }
    setGherkinLoading(true);
    setError('');
    setGherkinOutput('');
    setActiveTab('gherkin');
    try {
      const response = await fetch('http://localhost:8000/api/generate-gherkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_story: requirement,
          feature_name: featureName || 'Feature',
          include_scenario_outline: includeOutline
        })
      });
      if (!response.ok) throw new Error('Failed to generate Gherkin');
      const data = await response.json();
      setGherkinOutput(data.feature_file);
    } catch (err) {
      setError(err.message || 'Failed to generate Gherkin');
      setActiveTab('input');
    } finally {
      setGherkinLoading(false);
    }
  };

  const handleCopyGherkin = () => {
    navigator.clipboard.writeText(gherkinOutput);
    setGherkinCopied(true);
    setTimeout(() => setGherkinCopied(false), 2000);
  };

  const handleDownloadGherkin = () => {
    const blob = new Blob([gherkinOutput], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(featureName || 'feature').toLowerCase().replace(/\s+/g, '_')}.feature`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  // ── F01: Update a test case field inline ──────────────────────────────────
  const updateTestCase = (index, field, value) => {
    setTestCases(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleGenerateTestCases = async () => {
    if (!requirement.trim()) {
      setError('Please enter a requirement');
      return;
    }
    setLoading(true);
    setError('');
    setTestCases([]);
    setActiveTab('testcases');
    try {
      const cases = await generateTestCases(requirement, priority, '');
      setTestCases(cases);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to generate test cases');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateScript = async (testCase) => {
    setSelectedTestCase(testCase);
    setScriptLoading(true);
    setError('');
    setGeneratedScript('');
    setActiveTab('script');
    try {
      const result = await generateScript(testCase, language, framework);
      setGeneratedScript(result.script);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to generate script');
    } finally {
      setScriptLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = async () => {
    try {
      await exportCSV(testCases);
    } catch (err) {
      setError('Failed to export CSV');
    }
  };

  const loadSample = (sample) => {
    setRequirement(sample.description);
    setError('');
    setActiveTab('input');
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <Loader2 className="animate-spin text-indigo-600 mx-auto mb-4" size={48} />
          <p className="text-gray-600">Loading TestCrafter...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-6">
        <div className="w-full max-w-6xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl mb-4 shadow-xl">
              <Sparkles className="text-white" size={40} />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">TestCrafter</h1>
            <p className="text-gray-600 text-lg">AI-Powered Test Automation Platform</p>
          </div>
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md mx-auto">
            {authView === 'login' ? (
              <LoginForm onSwitchToSignup={() => setAuthView('signup')} onSuccess={() => {}} />
            ) : (
              <SignupForm onSwitchToLogin={() => setAuthView('login')} onSuccess={() => {}} />
            )}
          </div>
          <div className="mt-8 text-center">
            <div className="flex items-center justify-center gap-8 text-sm text-gray-600">
              <div className="flex items-center gap-2"><Shield size={16} className="text-indigo-600" /><span>Secure & Private</span></div>
              <div className="flex items-center gap-2"><Zap size={16} className="text-indigo-600" /><span>Lightning Fast</span></div>
              <div className="flex items-center gap-2"><Code size={16} className="text-indigo-600" /><span>20+ Frameworks</span></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* NEW PROJECT MODAL */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Create New Project</h3>
              <button onClick={() => setShowNewProjectModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Project Name *</label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="My Test Automation Project"
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  placeholder="Brief description of your project..."
                  rows={3}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowNewProjectModal(false)} className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-lg font-semibold hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  onClick={handleCreateProject}
                  disabled={!newProjectName.trim()}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50"
                >
                  Create Project
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-gradient-to-b from-indigo-600 to-purple-700 text-white transition-all duration-300 overflow-hidden flex flex-col`}>
        {/* User Profile Section */}
        <div className="p-4 border-b border-indigo-500/30">
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex items-center gap-3 p-3 hover:bg-white/10 rounded-lg transition-all"
            >
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <User size={20} className="text-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-sm">{user?.username || 'User'}</p>
                <p className="text-xs text-indigo-200 truncate">{user?.email || ''}</p>
              </div>
              <ChevronRight size={16} className={`transition-transform ${showUserMenu ? 'rotate-90' : ''}`} />
            </button>
            {showUserMenu && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl py-2 z-50">
                <button
                  onClick={() => setShowUserMenu(false)}
                  className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <Settings size={16} /><span className="text-sm">Settings</span>
                </button>
                <hr className="my-2" />
                <button
                  onClick={() => { logout(); setShowUserMenu(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={16} /><span className="text-sm">Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Logo */}
        <div className="p-6 border-b border-indigo-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <Sparkles className="text-indigo-600" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold">TestCrafter</h1>
              <p className="text-xs text-indigo-200">Pro Edition</p>
            </div>
          </div>
        </div>

        {/* Projects */}
        <div className="p-4 border-b border-indigo-500/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-indigo-200 uppercase">Projects</span>
            <button onClick={() => setShowNewProjectModal(true)} className="p-1 hover:bg-white/10 rounded transition-all" title="New Project">
              <Plus size={16} />
            </button>
          </div>
          {projects.length === 0 ? (
            <button
              onClick={() => setShowNewProjectModal(true)}
              className="w-full p-3 border-2 border-dashed border-indigo-400/50 rounded-lg hover:border-indigo-400 hover:bg-white/5 transition-all text-sm"
            >
              + Create First Project
            </button>
          ) : (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => setCurrentProject(project)}
                  className={`w-full flex items-center gap-2 p-2 rounded-lg transition-all text-left ${currentProject?.id === project.id ? 'bg-white/20 shadow-lg' : 'hover:bg-white/10'}`}
                >
                  <Folder size={16} />
                  <span className="text-sm truncate flex-1">{project.name}</span>
                  {project.test_cases_count > 0 && (
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{project.test_cases_count}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button
            onClick={() => setActiveTab('input')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'input' ? 'bg-white/20 shadow-lg' : 'hover:bg-white/10'}`}
          >
            <FileText size={20} /><span className="font-medium">Requirements</span>
          </button>
          <button
            onClick={() => setActiveTab('testcases')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'testcases' ? 'bg-white/20 shadow-lg' : 'hover:bg-white/10'}`}
            disabled={testCases.length === 0}
          >
            <Play size={20} /><span className="font-medium">Test Cases</span>
            {testCases.length > 0 && (
              <span className="ml-auto bg-white text-indigo-600 text-xs font-bold px-2 py-1 rounded-full">{testCases.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('script')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'script' ? 'bg-white/20 shadow-lg' : 'hover:bg-white/10'}`}
            disabled={!generatedScript}
          >
            <Code size={20} /><span className="font-medium">Automation</span>
          </button>
          <button
            onClick={() => setActiveTab('gherkin')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'gherkin' ? 'bg-white/20 shadow-lg' : 'hover:bg-white/10'}`}
            disabled={!gherkinOutput}
          >
            <FileText size={20} /><span className="font-medium">BDD Gherkin</span>
            {gherkinOutput && (
              <span className="ml-auto bg-green-400 text-white text-xs font-bold px-2 py-1 rounded-full">✓</span>
            )}
          </button>
        </nav>

        <div className="p-4 border-t border-indigo-500">
          <div className="bg-white/10 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={16} className="text-yellow-300" />
              <span className="text-sm font-semibold">Quick Stats</span>
            </div>
            <div className="space-y-1 text-xs text-indigo-200">
              <div className="flex justify-between"><span>Generated:</span><span className="font-bold">{testCases.length}</span></div>
              <div className="flex justify-between"><span>Scripts:</span><span className="font-bold">{generatedScript ? 1 : 0}</span></div>
              <div className="flex justify-between"><span>Projects:</span><span className="font-bold">{projects.length}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {activeTab === 'input' && 'Create Requirements'}
                {activeTab === 'testcases' && 'Generated Test Cases'}
                {activeTab === 'script' && 'Automation Script'}
                {activeTab === 'gherkin' && 'BDD Gherkin Feature File'}
              </h2>
              <p className="text-sm text-gray-500">
                {currentProject ? (
                  <span className="flex items-center gap-2"><Folder size={14} />{currentProject.name}</span>
                ) : (
                  'AI-powered test automation platform'
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="font-medium">GroqCloud Active</span>
            </div>
          </div>
        </header>

        {/* Error Banner */}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <p className="font-semibold text-red-800">Error</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <button onClick={() => setError('')} className="text-red-500 hover:text-red-700"><X size={18} /></button>
            </div>
          </div>
        )}

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-6">

          {/* ── Input Tab ── */}
          {activeTab === 'input' && (
            <div className="max-w-6xl mx-auto">
              {!currentProject && (
                <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-yellow-500 flex-shrink-0 mt-0.5" size={20} />
                    <div>
                      <p className="font-semibold text-yellow-800">No Project Selected</p>
                      <p className="text-sm text-yellow-700">
                        Create a project to organize your test cases.{' '}
                        <button onClick={() => setShowNewProjectModal(true)} className="underline font-semibold">Create Project</button>
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">User Story / Requirement</label>
                    <textarea
                      value={requirement}
                      onChange={(e) => setRequirement(e.target.value)}
                      placeholder="Describe your feature or user story here...&#10;&#10;Example: As a user, I want to log in to the application using my email and password so that I can access my dashboard."
                      className="w-full h-64 p-4 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none transition-all"
                    />
                    <div className="mt-4 flex items-center gap-4">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Priority Level</label>
                        <select
                          value={priority}
                          onChange={(e) => setPriority(e.target.value)}
                          className="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option>High</option>
                          <option>Medium</option>
                          <option>Low</option>
                        </select>
                      </div>
                    </div>
                    {/* F08: Mode toggle */}
                    <div className="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                      <p className="text-sm font-semibold text-indigo-800 mb-3">Output Mode</p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setGherkinMode(false)}
                          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${!gherkinMode ? 'bg-indigo-600 text-white shadow' : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300'}`}
                        >
                          📋 Standard Test Cases
                        </button>
                        <button
                          onClick={() => setGherkinMode(true)}
                          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${gherkinMode ? 'bg-green-600 text-white shadow' : 'bg-white text-gray-600 border border-gray-200 hover:border-green-300'}`}
                        >
                          🥒 BDD Gherkin
                        </button>
                      </div>

                      {gherkinMode && (
                        <div className="mt-3 space-y-3">
                          <div>
                            <label className="block text-xs font-semibold text-indigo-700 mb-1">Feature Name (optional)</label>
                            <input
                              type="text"
                              value={featureName}
                              onChange={(e) => setFeatureName(e.target.value)}
                              placeholder="e.g. User Authentication"
                              className="w-full border-2 border-indigo-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={includeOutline}
                              onChange={(e) => setIncludeOutline(e.target.checked)}
                              className="w-4 h-4 text-green-600 rounded"
                            />
                            <span className="text-xs text-indigo-700 font-medium">Include Scenario Outline (data-driven)</span>
                          </label>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={gherkinMode ? handleGenerateGherkin : handleGenerateTestCases}
                      disabled={loading || gherkinLoading || !requirement.trim()}
                      className="mt-6 w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3.5 px-6 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
                    >
                      {loading ? (
                        <><Loader2 className="animate-spin" size={20} /><span>Generating Test Cases...</span></>
                      ) : gherkinLoading ? (
                        <><Loader2 className="animate-spin" size={20} /><span>Generating Gherkin...</span></>
                      ) : gherkinMode ? (
                        <><Sparkles size={20} /><span>Generate BDD Gherkin</span><ChevronRight size={20} /></>
                      ) : (
                        <><Sparkles size={20} /><span>Generate Test Cases</span><ChevronRight size={20} /></>
                      )}
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                      <Shield className="text-blue-600 mb-2" size={24} />
                      <h3 className="font-semibold text-blue-900 text-sm">AI-Powered</h3>
                      <p className="text-xs text-blue-700 mt-1">Advanced LLM models</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                      <Clock className="text-green-600 mb-2" size={24} />
                      <h3 className="font-semibold text-green-900 text-sm">Fast Generation</h3>
                      <p className="text-xs text-green-700 mt-1">Results in seconds</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                      <Code className="text-purple-600 mb-2" size={24} />
                      <h3 className="font-semibold text-purple-900 text-sm">Multi-Language</h3>
                      <p className="text-xs text-purple-700 mt-1">20+ frameworks</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Templates</h3>
                    <div className="space-y-3">
                      {sampleRequirements.map((sample, idx) => (
                        <button
                          key={idx}
                          onClick={() => loadSample(sample)}
                          className="w-full text-left p-4 bg-gradient-to-br from-gray-50 to-gray-100 hover:from-indigo-50 hover:to-purple-50 rounded-lg border border-gray-200 hover:border-indigo-300 transition-all group"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-xs font-semibold text-indigo-600 bg-indigo-100 px-2 py-1 rounded">{sample.category}</span>
                            <ChevronRight size={16} className="text-gray-400 group-hover:text-indigo-600 transition-colors" />
                          </div>
                          <h4 className="font-semibold text-gray-900 text-sm mb-1">{sample.title}</h4>
                          <p className="text-xs text-gray-600 line-clamp-2">{sample.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-6">
                    <h4 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                      <Sparkles size={18} />Pro Tips
                    </h4>
                    <ul className="space-y-2 text-sm text-indigo-800">
                      <li className="flex items-start gap-2"><span className="text-indigo-600 mt-0.5">•</span><span>Be specific about user roles and actions</span></li>
                      <li className="flex items-start gap-2"><span className="text-indigo-600 mt-0.5">•</span><span>Include expected outcomes clearly</span></li>
                      <li className="flex items-start gap-2"><span className="text-indigo-600 mt-0.5">•</span><span>Click any field on a test case to edit it</span></li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Test Cases Tab (F01: Inline Editing) ── */}
          {activeTab === 'testcases' && (
            <div className="max-w-6xl mx-auto">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {testCases.length} Test Case{testCases.length !== 1 ? 's' : ''} Generated
                  </h3>
                  <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                    <Edit2 size={13} className="text-indigo-400" />
                    Click any field to edit before exporting
                  </p>
                </div>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 transition-all shadow-md hover:shadow-lg font-medium"
                >
                  <Download size={18} />Export All
                </button>
              </div>

              <div className="space-y-4">
                {testCases.map((tc, tcIndex) => (
                  <div key={tc.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all overflow-hidden">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-mono font-semibold">{tc.id}</span>
                            <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                              tc.priority === 'High' ? 'bg-red-100 text-red-700' :
                              tc.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {tc.priority} Priority
                            </span>
                          </div>
                          {/* Editable Title */}
                          <h4 className="text-lg font-bold text-gray-900">
                            <EditableField
                              value={tc.title}
                              onSave={(val) => updateTestCase(tcIndex, 'title', val)}
                              className="text-lg font-bold text-gray-900"
                              inputClassName="text-lg font-bold text-gray-900 w-full border-2 border-indigo-300 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </h4>
                        </div>
                        {currentProject && (
                          <button
                            onClick={() => handleSaveTestCaseToProject(tc)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-all text-sm font-medium ml-4"
                            title="Save to current project"
                          >
                            <Save size={16} />Save
                          </button>
                        )}
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm border border-gray-200">
                        {/* Editable Preconditions */}
                        <div>
                          <span className="font-semibold text-indigo-700">Preconditions:</span>
                          <div className="mt-1">
                            <EditableField
                              value={tc.preconditions}
                              onSave={(val) => updateTestCase(tcIndex, 'preconditions', val)}
                              multiline
                              className="text-gray-700"
                              inputClassName="text-gray-700 w-full border-2 border-indigo-300 rounded-lg px-3 py-1 mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                            />
                          </div>
                        </div>

                        {/* Editable Steps */}
                        <div>
                          <span className="font-semibold text-indigo-700">Test Steps:</span>
                          <ol className="mt-2 space-y-1 text-gray-700">
                            {tc.steps.map((step, stepIdx) => (
                              <li key={stepIdx} className="flex items-start gap-2">
                                <span className="text-indigo-400 font-semibold min-w-[20px]">{stepIdx + 1}.</span>
                                <EditableField
                                  value={step}
                                  onSave={(val) => {
                                    const newSteps = [...tc.steps];
                                    newSteps[stepIdx] = val;
                                    updateTestCase(tcIndex, 'steps', newSteps);
                                  }}
                                  className="text-gray-700 flex-1"
                                  inputClassName="text-gray-700 w-full border-2 border-indigo-300 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                              </li>
                            ))}
                          </ol>
                        </div>

                        {/* Editable Expected Result */}
                        <div>
                          <span className="font-semibold text-indigo-700">Expected Result:</span>
                          <div className="mt-1">
                            <EditableField
                              value={tc.expected_result}
                              onSave={(val) => updateTestCase(tcIndex, 'expected_result', val)}
                              multiline
                              className="text-gray-700"
                              inputClassName="text-gray-700 w-full border-2 border-indigo-300 rounded-lg px-3 py-1 mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                            />
                          </div>
                        </div>

                        {/* Editable Test Data */}
                        {tc.test_data && (
                          <div>
                            <span className="font-semibold text-indigo-700">Test Data:</span>
                            <div className="mt-1">
                              <EditableField
                                value={tc.test_data}
                                onSave={(val) => updateTestCase(tcIndex, 'test_data', val)}
                                className="text-gray-600 font-mono text-xs"
                                inputClassName="text-gray-600 w-full border-2 border-indigo-300 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-4">
                        <button
                          onClick={() => handleGenerateScript(tc)}
                          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2.5 px-4 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md font-medium flex items-center justify-center gap-2"
                        >
                          <Code size={18} />Generate Automation Script
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Gherkin Tab (F08) ── */}
          {activeTab === 'gherkin' && gherkinOutput && (
            <div className="max-w-5xl mx-auto">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Header bar */}
                <div className="bg-green-800 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-green-300 font-mono text-sm">🥒</span>
                    <span className="text-green-100 font-mono text-sm">
                      {(featureName || 'feature').toLowerCase().replace(/\s+/g, '_')}.feature
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopyGherkin}
                      className="flex items-center gap-2 bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-all text-sm"
                    >
                      {gherkinCopied ? <Check size={16} /> : <Copy size={16} />}
                      {gherkinCopied ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                      onClick={handleDownloadGherkin}
                      className="flex items-center gap-2 bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-all text-sm"
                    >
                      <Download size={16} />
                      Download .feature
                    </button>
                  </div>
                </div>
                {/* Gherkin content */}
                <pre className="bg-gray-950 text-green-300 p-6 overflow-x-auto text-sm leading-relaxed font-mono whitespace-pre">
                  <code>{gherkinOutput}</code>
                </pre>
              </div>

              {/* Info banner */}
              <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
                <span className="text-2xl">💡</span>
                <div>
                  <p className="font-semibold text-green-800 text-sm">How to use this .feature file</p>
                  <p className="text-green-700 text-xs mt-1">
                    Save as <code className="bg-green-100 px-1 rounded">.feature</code> and use with{' '}
                    <strong>Cucumber (Java)</strong>, <strong>Behave (Python)</strong>, or{' '}
                    <strong>Playwright BDD (TypeScript)</strong>. Each Scenario maps to one test case.
                  </p>
                </div>
              </div>

              {/* Re-generate button */}
              <div className="mt-4">
                <button
                  onClick={() => { setActiveTab('input'); setGherkinMode(true); }}
                  className="w-full border-2 border-green-600 text-green-700 py-2.5 px-4 rounded-lg hover:bg-green-50 transition-all font-medium flex items-center justify-center gap-2"
                >
                  <Sparkles size={18} />
                  Generate New Gherkin
                </button>
              </div>
            </div>
          )}

          {/* ── Script Tab ── */}
          {activeTab === 'script' && selectedTestCase && (
            <div className="max-w-6xl mx-auto">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{selectedTestCase.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">Test Case: {selectedTestCase.id}</p>
                  </div>
                  <span className={`px-4 py-2 rounded-lg font-semibold ${
                    selectedTestCase.priority === 'High' ? 'bg-red-100 text-red-700' :
                    selectedTestCase.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {selectedTestCase.priority}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Programming Language</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option>Python</option>
                      <option>JavaScript</option>
                      <option>Java</option>
                      <option>C#</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Test Framework</label>
                    <select
                      value={framework}
                      onChange={(e) => setFramework(e.target.value)}
                      className="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option>Selenium</option>
                      <option>Playwright</option>
                      <option>CodeceptJS</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={() => handleGenerateScript(selectedTestCase)}
                  disabled={scriptLoading}
                  className="mt-4 w-full bg-indigo-600 text-white py-2.5 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all font-medium flex items-center justify-center gap-2"
                >
                  {scriptLoading ? (
                    <><Loader2 className="animate-spin" size={18} />Generating...</>
                  ) : (
                    <><Code size={18} />Regenerate Script with {language} & {framework}</>
                  )}
                </button>
              </div>

              {scriptLoading ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
                  <div className="flex flex-col items-center justify-center">
                    <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
                    <p className="text-lg font-semibold text-gray-900">Generating {language} {framework} Script...</p>
                    <p className="text-sm text-gray-500 mt-2">This may take 5-10 seconds</p>
                  </div>
                </div>
              ) : generatedScript ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-gray-900 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Code className="text-gray-400" size={20} />
                      <span className="text-gray-300 font-mono text-sm">{selectedTestCase.id}.py</span>
                    </div>
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-all"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <pre className="bg-gray-900 text-gray-100 p-6 overflow-x-auto text-sm leading-relaxed max-h-96">
                    <code>{generatedScript}</code>
                  </pre>
                </div>
              ) : null}
            </div>
          )}
        </main>

        <footer className="bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <p>TestCrafter Pro v1.0 • Powered by GroqCloud AI</p>
            <p>© 2025 TestCrafter. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;