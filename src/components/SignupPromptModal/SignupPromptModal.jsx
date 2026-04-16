import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { XIcon, HeartIcon } from '../Icons/Icons';
import './SignupPromptModal.css';

function SignupPromptModal({ isOpen, onClose }) {
    const navigate = useNavigate();

    // Handle escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
            <div className="modal-content signup-prompt-modal" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
                    <XIcon size={24} />
                </button>
                
                <div className="prompt-header">
                    <div className="prompt-icon">
                        <HeartIcon className="heart-pulse" size={32} />
                    </div>
                    <h2>Recipe Saved!</h2>
                </div>

                <div className="prompt-body">
                    <p>Your recipe has been saved locally. <strong>Sign up to sync it</strong> across all your devices and keep it permanently.</p>
                    <ul className="prompt-features">
                        <li><span>✓</span> 100% Free forever</li>
                        <li><span>✓</span> No spam emails</li>
                        <li><span>✓</span> No data sharing</li>
                    </ul>
                </div>

                <div className="prompt-actions">
                    <button 
                        className="btn btn-primary full-width"
                        onClick={() => {
                            onClose();
                            navigate('/signup');
                        }}
                    >
                        Create Free Account
                    </button>
                    <button className="btn btn-outline full-width" onClick={onClose}>
                        Maybe Later
                    </button>
                </div>
            </div>
        </div>
    );
}

export default SignupPromptModal;
