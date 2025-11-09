import Head from 'next/head';
import { useState } from 'react';

// Simplified Styling for Professional Look
const styles = {
  container: {
    minHeight: '100vh',
    padding: '0 0.5rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F6F9', // Light Grey Background
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: '3rem',
    borderRadius: '12px',
    boxShadow: '0 10px 30px rgba(0, 77, 153, 0.1)', // Subtle Blue Shadow
    maxWidth: '600px',
    width: '100%',
    textAlign: 'center',
  },
  logo: {
    marginBottom: '1.5rem',
    width: '100px',
    height: 'auto',
  },
  dropzone: {
    border: '3px dashed #004D99', // Deep Navy Blue Border
    padding: '2rem',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '1.5rem',
    marginBottom: '1.5rem',
    color: '#004D99',
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#FF6B6B', // Secondary Red/Orange CTA
    color: 'white',
    border: 'none',
    padding: '0.75rem 2rem',
    borderRadius: '6px',
    fontSize: '1.1rem',
    cursor: 'pointer',
    transition: 'background-color 0.3s',
  }
};

export default function Home() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileChange = (event) => {
    const uploadedFile = event.target.files[0];
    if (uploadedFile && (uploadedFile.type === 'application/pdf' || uploadedFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
      setFile(uploadedFile);
    } else {
      alert('Please upload a PDF or DOCX file.');
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a resume file first.');
      return;
    }

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('resume', file);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Analysis failed:', error);
      setResult({ error: 'Failed to connect to analysis engine.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <Head>
        <title>Internadda | ATS Score Checker</title>
      </Head>

      <main style={styles.card}>
        <img src="/logo.png" alt="Internadda Logo" style={styles.logo} />
        <h1>Pass the ATS. Land the Interview.</h1>
        <p>Instantly analyze your resume's compatibility and get the actionable insights you need.</p>

        {!result ? (
          <>
            <div style={styles.dropzone} onClick={() => document.getElementById('fileInput').click()}>
              {file ? `File Selected: ${file.name}` : 'Drag & Drop Your Resume (PDF or DOCX)'}
              <input 
                id="fileInput" 
                type="file" 
                accept=".pdf,.docx" 
                style={{ display: 'none' }} 
                onChange={handleFileChange} 
              />
            </div>

            <button 
              style={styles.button} 
              onClick={handleUpload} 
              disabled={loading || !file}
            >
              {loading ? 'ANALYZING...' : 'ANALYZE MY RESUME'}
            </button>
            <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>Your privacy is guaranteed. Files are deleted after analysis.</p>
          </>
        ) : (
          <div style={{ textAlign: 'left', marginTop: '2rem' }}>
            <h2>✅ Your ATS Analysis Report</h2>
            {result.error ? (
              <p style={{ color: 'red', fontWeight: 'bold' }}>Error: {result.error}</p>
            ) : (
              <>
                <h3 style={{ color: '#004D99' }}>ATS Score: {result.score || 'N/A'}/100</h3>
                <p><strong>Status:</strong> {result.message || 'Analysis complete.'}</p>
                
                {/* Placeholder for detailed insights (actual data from backend) */}
                <h4 style={{ color: '#FF6B6B', marginTop: '1.5rem' }}>🎯 Critical Insights</h4>
                <ul>
                  {/* These will be dynamically rendered from the backend response */}
                  <li><strong>Keywords:</strong> {result.keywords_status || 'Needs Improvement.'}</li>
                  <li><strong>Formatting:</strong> {result.formatting_status || 'Excellent.'}</li>
                  <li><strong>Action:</strong> {result.recommendation || 'Review the full report.'}</li>
                </ul>

                <button 
                  style={{ ...styles.button, backgroundColor: '#004D99', marginTop: '2rem' }}
                  onClick={() => setResult(null)}
                >
                  Analyze Another Resume
                </button>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
