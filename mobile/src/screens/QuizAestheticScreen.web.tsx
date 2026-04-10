import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';

import { FluidBackground } from '../components/quiz/FluidBackground.web';
import { RootStackParamList } from '../navigation/types';
import { api, endpoints } from '../services/api';
import { budgetOptions, moodOptions, styleOptions } from './quizConfig';

type Props = NativeStackScreenProps<RootStackParamList, 'QuizAesthetic'>;

const imageStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  zIndex: 0,
};

export function QuizAestheticScreen({ navigation }: Props) {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [projectInput, setProjectInput] = useState('');

  const handleCardClick = async (cardTitle: string, dbValue: 'Budget' | 'Standard' | 'Premium' | 'Luxury' | null = null) => {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setSelectedCard(cardTitle);

    try {
      let payload: Record<string, string> = {};
      if (step === 1) {
        payload = { aesthetic_style: cardTitle };
      } else if (step === 2) {
        payload = { mood_feel: cardTitle };
      } else if (step === 3) {
        payload = { budget: dbValue || 'Standard' };
      }

      const response = await api.put(endpoints.authProfile, payload);
      if (response.status === 200) {
        setSelectedCard(null);
        setStep((prev) => prev + 1);
      } else {
        toast.error('Failed to save your selection. Please try again.');
        setSelectedCard(null);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || error?.response?.data?.message || 'Failed to save your selection. Please try again.');
      setSelectedCard(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProjectSubmit = async () => {
    if (!projectInput.trim()) {
      toast.error("Please enter what you're working on.");
      return;
    }
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.put(endpoints.authProfile, { project: projectInput.trim() });
      if (response.status === 200) {
        toast.success('Quiz completed successfully!');
        navigation.replace('Home');
      } else {
        toast.error('Failed to save your project. Please try again.');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || error?.response?.data?.message || 'Failed to save your project. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const cardStyleFor = (cardTitle: string): React.CSSProperties => ({
    width: '280px',
    height: '280px',
    padding: '3px',
    position: 'relative',
    borderRadius: '6px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-end',
    textAlign: 'center',
    fontSize: '1rem',
    color: selectedCard === cardTitle ? 'rgb(88 199 250 / 100%)' : 'rgb(88 199 250 / 0%)',
    cursor: isLoading ? 'not-allowed' : 'pointer',
    fontFamily: 'cursive',
    overflow: 'hidden',
    minWidth: '160px',
    opacity: isLoading && selectedCard !== cardTitle ? 0.6 : 1,
    transform: selectedCard === cardTitle ? 'scale(1.05)' : 'scale(1)',
    transition: 'all 0.3s ease',
    border: selectedCard === cardTitle ? '2px solid rgb(88 199 250)' : '2px solid transparent',
  });

  return (
    <>
      <style>{`
        @property --rotate {
          syntax: '<angle>';
          initial-value: 132deg;
          inherits: false;
        }

        .magic-card::before {
          content: '';
          width: 104%;
          height: 102%;
          border-radius: 8px;
          background-image: linear-gradient(var(--rotate), #5ddcff, #3c67e3 43%, #4e00c2);
          position: absolute;
          z-index: -1;
          top: -1%;
          left: -2%;
          animation: spin 2.5s linear infinite;
        }

        .magic-card::after {
          position: absolute;
          content: '';
          top: calc(35vh / 6);
          left: 0;
          right: 0;
          z-index: -1;
          height: 100%;
          width: 100%;
          margin: 0 auto;
          transform: scale(0.8);
          filter: blur(calc(35vh / 6));
          background-image: linear-gradient(var(--rotate), #5ddcff, #3c67e3 43%, #4e00c2);
          opacity: 1;
          transition: opacity 0.5s;
          animation: spin 2.5s linear infinite;
        }

        .magic-card:hover {
          color: rgb(88 199 250 / 100%) !important;
          transition: color 1s;
        }

        .magic-card:hover::before,
        .magic-card:hover::after {
          animation: none;
          opacity: 0;
        }

        @keyframes spin {
          0% { --rotate: 0deg; }
          100% { --rotate: 360deg; }
        }
      `}</style>

      <FluidBackground />
      <Toaster position="top-right" />

      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1.5rem',
          fontFamily: 'sans-serif',
          overflow: 'auto',
          padding: '2rem 1rem',
        }}
      >
        {step === 1 ? (
          <>
            <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', flexWrap: 'wrap', width: '100%' }}>
              {styleOptions.slice(0, 3).map((card) => (
                <div key={card.value} className="magic-card" style={cardStyleFor(card.value)} onClick={() => handleCardClick(card.value)}>
                  <img src={card.imageUrl} alt={card.value} style={imageStyle} />
                </div>
              ))}
            </div>

            <div
              style={{
                color: '#ffffff',
                fontFamily: "'Playfair Display', serif",
                fontSize: '1.5rem',
                fontWeight: 'bold',
                letterSpacing: '2px',
                margin: '1rem 0',
                textShadow: '0 0 15px rgba(93, 220, 255, 0.4)',
              }}
            >
              Pick the kitchen that feels most like you
            </div>

            <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', flexWrap: 'wrap', width: '100%' }}>
              {styleOptions.slice(3).map((card) => (
                <div key={card.value} className="magic-card" style={cardStyleFor(card.value)} onClick={() => handleCardClick(card.value)}>
                  <img src={card.imageUrl} alt={card.value} style={imageStyle} />
                </div>
              ))}
            </div>
          </>
        ) : step === 2 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', width: '100%' }}>
            <div
              style={{
                color: '#ffffff',
                fontFamily: "'Playfair Display', serif",
                fontSize: '1.5rem',
                fontWeight: 'bold',
                letterSpacing: '2px',
                textShadow: '0 0 15px rgba(93, 220, 255, 0.4)',
              }}
            >
              Choose your dream bedroom vibe
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 280px)', gap: '2rem', justifyContent: 'center', width: '100%' }}>
              {moodOptions.map((card) => (
                <div key={card.value} className="magic-card" style={cardStyleFor(card.value)} onClick={() => handleCardClick(card.value)}>
                  <img src={card.imageUrl} alt={card.value} style={imageStyle} />
                </div>
              ))}
            </div>
          </div>
        ) : step === 3 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', width: '100%' }}>
            <div
              style={{
                color: '#ffffff',
                fontFamily: "'Playfair Display', serif",
                fontSize: '1.5rem',
                fontWeight: 'bold',
                letterSpacing: '2px',
                textShadow: '0 0 15px rgba(93, 220, 255, 0.4)',
              }}
            >
              What's your approximate budget range?
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 200px)', gap: '1.5rem', justifyContent: 'center' }}>
              {budgetOptions.map((card) => (
                <div
                  key={card.title}
                  style={{
                    padding: '20px',
                    backgroundColor: selectedCard === card.title ? 'rgb(88, 199, 250)' : 'rgba(88, 199, 250, 0.1)',
                    border: selectedCard === card.title ? '2px solid rgb(88, 199, 250)' : '2px solid rgba(88, 199, 250, 0.3)',
                    borderRadius: '8px',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    color: selectedCard === card.title ? '#000' : '#ffffff',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    textAlign: 'center',
                    transition: 'all 0.3s ease',
                    opacity: isLoading && selectedCard !== card.title ? 0.6 : 1,
                  }}
                  onClick={() => handleCardClick(card.title, card.dbValue)}
                >
                  {card.title}
                </div>
              ))}
            </div>
          </div>
        ) : step === 4 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', width: '100%' }}>
            <div
              style={{
                color: '#ffffff',
                fontFamily: "'Playfair Display', serif",
                fontSize: '1.5rem',
                fontWeight: 'bold',
                letterSpacing: '2px',
                textShadow: '0 0 15px rgba(93, 220, 255, 0.4)',
                marginTop: '1rem',
              }}
            >
              What are you currently working on?
            </div>

            <input
              type="text"
              value={projectInput}
              onChange={(e) => setProjectInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleProjectSubmit();
                }
              }}
              placeholder="e.g.: Home renovation, Event Planning, Interior Design"
              style={{
                width: '100%',
                maxWidth: '500px',
                padding: '12px 16px',
                fontSize: '1rem',
                border: '2px solid rgb(88, 199, 250)',
                borderRadius: '6px',
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                color: '#ffffff',
                outline: 'none',
                transition: 'all 0.3s ease',
                boxShadow: '0 0 15px rgba(93, 220, 255, 0.2)',
              }}
            />

            <button
              type="button"
              onClick={handleProjectSubmit}
              disabled={isLoading}
              style={{
                padding: '12px 32px',
                fontSize: '1rem',
                fontWeight: 'bold',
                backgroundColor: 'rgb(88, 199, 250)',
                color: '#000',
                border: 'none',
                borderRadius: '6px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.55 : 1,
                transition: 'all 0.3s ease',
              }}
            >
              {isLoading ? 'Saving...' : 'Complete Quiz'}
            </button>
          </div>
        ) : (
          <div style={{ color: '#d1d5db', textAlign: 'center', maxWidth: '800px', lineHeight: '1.7' }}>
            Thank you for completing the quiz!
          </div>
        )}
      </div>
    </>
  );
}
