import React, { useState } from 'react';
import axios from 'axios';

const ParserPanel = () => {
  const [inputText] = useState("Earthquake Magnitude 6.4 detected near downtown.");
  const [loading, setLoading] = useState(false);
  const [aiData, setAiData] = useState(null);

  const analyzeAI = async () => {
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:8000/ai/analyze', { text: inputText });
      setAiData(res.data);
    } catch (e) { alert('AI analysis failed'); }
    setLoading(false);
  };

  return (
    <div className="parser-panel" style={{ zIndex: 1000 }}>
      <div className="parser-title">🤖 AI DISASTER INTELLIGENCE</div>
      <div className="parser-sub">Connected to AI Model</div>
      <div className="parser-input">{inputText}</div>
      
      <div className="parsed-tag">
        <span className="badge green" onClick={analyzeAI} style={{ cursor: 'pointer' }}>
          {loading ? 'ANALYZING...' : 'ANALYZE'}
        </span>
      </div>

      {aiData && (
        <div className="json-block" style={{ maxHeight: '150px', overflowY: 'auto', fontSize: '8px' }}>
          <b style={{ color: aiData.threat === 'HIGH' ? '#fca5a5' : '#facc15' }}>THREAT LEVEL: {aiData.threat}</b><br/><br/>
          <b>Impact:</b><br/>
          Infrastructure: {aiData.impact.infrastructure}<br/>
          Medical: {aiData.impact.medical}<br/>
          Evac: {aiData.impact.evac}<br/><br/>
          <b>Actions:</b><br/>
          {aiData.actions.map((a, i) => <span key={i}>• {a}<br/></span>)}
        </div>
      )}
    </div>
  );
};

export default ParserPanel;