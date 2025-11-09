import Head from 'next/head';
import { useState } from 'react';

// --- Styling ---
const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F6F9', // Light Grey Background
    fontFamily: 'Arial, sans-serif',
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: '3rem',
    borderRadius: '12px',
    boxShadow: '0 15px 40px rgba(0, 77, 153, 0.15)', // Professional Shadow
    maxWidth: '700px',
    width: '90%',
    textAlign: 'center',
  },
  logo: {
    marginBottom: '1.5rem',
    width: '120px',
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
    transition: 'background-color 0.2s',
  },
  button: {
    backgroundColor: '#FF6B6B', // Secondary Red/Orange CTA
    color: 'white',
    border: 'none',
    padding: '0.75rem 2.5rem',
    borderRadius: '6px',
    fontSize: '1.1rem',
    cursor: 'pointer',
    transition: 'background-color 0.3s',
  },
  scoreDisplay: (score) => ({
    fontSize: '3rem',
    fontWeight: 'bold',
    color: score >= 80 ? 'green' : (score >= 60 ? 'orange' : '#FF6B6B'),
    margin: '1rem 0',
  }),
  recommendationList: {
    listStyleType: 'none',
    padding: 0,
    textAlign: 'left',
  },
  listItem: (type) => ({
    padding: '0.75rem',
    marginBottom: '0.5rem',
    borderRadius: '4px',
    backgroundColor: type === '🟢' ? '#E6FFED' : (type === '🟡' ? '#FFFBEB' : '#FEE2E2'),
    color: '#333',
    borderLeft: `5px solid ${type === '🟢' ? 'green' : (type === '🟡' ? 'orange' : 'red')}`,
    fontSize: '1rem',
  })
};

export default function Home() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (event) => {
    const uploadedFile = event.target.files[0];
    if (uploadedFile && (uploadedFile.type === 'application/pdf' || uploadedFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
      setFile(uploadedFile);
      setError(null);
    } else {
      setError('Please upload a PDF or DOCX file.');
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setResult(null);
    setError(null);

    // CRITICAL FIX: Use FileReader to send the file as a raw ArrayBuffer
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      const fileBuffer = event.target.result;

      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          // Send the raw file data
          body: fileBuffer, 
          headers: {
            // Specify the file type
            'Content-Type': file.type || 'application/octet-stream',
            // Send the filename/extension for the Python parser to use
            'X-File-Name': file.name,
          },
        });

        const data = await response.json();
        
        if (response.ok) {
          setResult(data);
        } else {
          setError(data.detail || `Analysis failed due to a server error. Status: ${response.status}`);
        }
      } catch (e) {
        console.error('Network or system error:', e);
        setError('A network error occurred. Please check your file and try again.');
      } finally {
        setLoading(false);
      }
    };
    
    // Start reading the file as a raw ArrayBuffer
    reader.readAsArrayBuffer(file);
  };

  // --- Render Functions ---
  
  const renderUploader = () => (
    <>
      <div 
        style={styles.dropzone} 
        onClick={() => document.getElementById('fileInput').click()}
      >
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
      {error && <p style={{ color: 'red', marginTop: '1rem' }}>{error}</p>}
      <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>Your privacy is guaranteed. Files are deleted after analysis.</p>
    </>
  );

  const renderResults = () => {
    const score = result.score || 0;
    
    return (
      <div style={{ textAlign: 'left', marginTop: '2rem' }}>
        <h2 style={{ color: '#004D99', borderBottom: '2px solid #FF6B6B', paddingBottom: '0.5rem' }}>✅ Your Internadda ATS Report</h2>
        
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ flexGrow: 1 }}>
            <p style={{ fontSize: '1.2rem', color: '#555' }}>Final ATS Score:</p>
            <div style={styles.scoreDisplay(score)}>{score} / 100</div>
            <p style={{ fontWeight: 'bold' }}>Status: {result.status}</p>
          </div>
          <div style={{ width: '40%', textAlign: 'right' }}>
            
          </div>
        </div>

        <h3 style={{ color: '#FF6B6B', marginTop: '1.5rem' }}>🎯 Actionable Recommendations</h3>
        <ul style={styles.recommendationList}>
          {result.recommendations && result.recommendations.map((rec, index) => {
            let type = '🟢';
            if (rec.includes('Critical') || rec.includes('Too Short')) type = '🔴';
            else if (rec.includes('Weak') || rec.includes('Too Long')) type = '🟡';

            return (
              <li key={index} style={styles.listItem(type)}>
                {type} {rec}
              </li>
            );
          })}
          <li style={styles.listItem('🟢')}>Word Count: {result.word_count || 'N/A'}.</li>
        </ul>

        <button 
          style={{ ...styles.button, backgroundColor: '#004D99', marginTop: '3rem' }}
          onClick={() => { setResult(null); setFile(null); setError(null); }}
        >
          Analyze Another Resume
        </button>
      </div>
    );
  };

  // --- Main Render ---

  return (
    <div style={styles.container}>
      <Head>
        <title>Internadda | ATS Score Checker</title>
      </Head>

      <main style={styles.card}>
        <img src="/logo.png" alt="Internadda Logo" style={styles.logo} />
        <h1>Pass the ATS. Get Hired.</h1>
        <p>Instantly analyze your resume's compatibility and get the actionable insights you need to beat the bots.</p>

        {result ? renderResults() : renderUploader()}
      </main>
    </div>
  );
}
