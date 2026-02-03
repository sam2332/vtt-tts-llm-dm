"""
AI DM Listener - Python Service
Main Flask API server for ML/AI operations
"""

import os
import sys
import json
import base64
import tempfile
import logging
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Global services (lazy loaded)
whisper_model = None
embedding_model = None
speaker_embeddings = {}
chroma_client = None
chroma_collection = None
tts_engine = None

# Configuration
CONFIG = {
    'whisper_model': 'base.en',
    'embedding_model': 'all-MiniLM-L6-v2',
    'sample_rate': 16000,
    'data_dir': os.environ.get('AI_DM_DATA_DIR', './data')
}


def get_whisper_model():
    """Lazy load Whisper model"""
    global whisper_model
    if whisper_model is None:
        logger.info(f"Loading Whisper model: {CONFIG['whisper_model']}")
        import whisper
        whisper_model = whisper.load_model(CONFIG['whisper_model'])
        logger.info("Whisper model loaded successfully")
    return whisper_model


def get_embedding_model():
    """Lazy load sentence transformer model"""
    global embedding_model
    if embedding_model is None:
        logger.info(f"Loading embedding model: {CONFIG['embedding_model']}")
        from sentence_transformers import SentenceTransformer
        embedding_model = SentenceTransformer(CONFIG['embedding_model'])
        logger.info("Embedding model loaded successfully")
    return embedding_model


def get_chroma_collection():
    """Lazy load ChromaDB collection"""
    global chroma_client, chroma_collection
    if chroma_collection is None:
        logger.info("Initializing ChromaDB")
        import chromadb
        from chromadb.utils import embedding_functions
        
        data_dir = Path(CONFIG['data_dir'])
        data_dir.mkdir(parents=True, exist_ok=True)
        
        chroma_client = chromadb.PersistentClient(path=str(data_dir / 'chroma'))
        
        # Use sentence transformers for embeddings
        ef = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name=CONFIG['embedding_model']
        )
        
        chroma_collection = chroma_client.get_or_create_collection(
            name="campaign_knowledge",
            embedding_function=ef,
            metadata={"hnsw:space": "cosine"}
        )
        logger.info("ChromaDB initialized successfully")
    return chroma_collection


def get_tts_engine():
    """Lazy load TTS engine"""
    global tts_engine
    if tts_engine is None:
        logger.info("Loading TTS engine")
        try:
            from TTS.api import TTS
            # Use a high-quality English model
            tts_engine = TTS(model_name="tts_models/en/ljspeech/tacotron2-DDC")
            logger.info("TTS engine loaded successfully")
        except Exception as e:
            logger.warning(f"Failed to load Coqui TTS: {e}. TTS will be unavailable.")
            tts_engine = None
    return tts_engine


# ============== Health & Status ==============

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'services': {
            'whisper': whisper_model is not None,
            'embeddings': embedding_model is not None,
            'chromadb': chroma_collection is not None,
            'tts': tts_engine is not None
        }
    })


@app.route('/status', methods=['GET'])
def get_status():
    """Get detailed status of all services"""
    return jsonify({
        'whisper_model': CONFIG['whisper_model'],
        'embedding_model': CONFIG['embedding_model'],
        'speakers_enrolled': len(speaker_embeddings),
        'knowledge_entries': get_chroma_collection().count() if chroma_collection else 0
    })


# ============== Transcription ==============

@app.route('/transcribe', methods=['POST'])
def transcribe():
    """
    Transcribe audio to text using Whisper
    
    Request body:
    {
        "audio_data": "<base64 encoded audio>",
        "initial_prompt": "Optional D&D context prompt"
    }
    
    Response:
    {
        "text": "Transcribed text",
        "segments": [...],
        "language": "en"
    }
    """
    try:
        data = request.json
        audio_b64 = data.get('audio_data')
        initial_prompt = data.get('initial_prompt', '')
        
        if not audio_b64:
            return jsonify({'error': 'No audio data provided'}), 400
        
        # Decode audio
        audio_bytes = base64.b64decode(audio_b64)
        
        # Write to temp file
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
            f.write(audio_bytes)
            temp_path = f.name
        
        try:
            # Check if ffmpeg is available
            import shutil
            if not shutil.which('ffmpeg'):
                # Try to find ffmpeg in common Windows locations
                ffmpeg_paths = [
                    r'C:\ffmpeg\bin',
                    r'C:\Program Files\ffmpeg\bin',
                    os.path.expandvars(r'%LOCALAPPDATA%\Microsoft\WinGet\Links'),
                ]
                for path in ffmpeg_paths:
                    if os.path.exists(path):
                        os.environ['PATH'] = path + os.pathsep + os.environ.get('PATH', '')
                        logger.info(f"Added {path} to PATH for ffmpeg")
                        break
                
                # Check again
                if not shutil.which('ffmpeg'):
                    logger.error("ffmpeg not found in PATH. Please install ffmpeg.")
                    return jsonify({'error': 'ffmpeg not found. Please install ffmpeg and restart the application.'}), 500
            
            # Transcribe
            model = get_whisper_model()
            result = model.transcribe(
                temp_path,
                initial_prompt=initial_prompt,
                language='en'
            )
            
            return jsonify({
                'text': result['text'].strip(),
                'segments': result.get('segments', []),
                'language': result.get('language', 'en')
            })
        finally:
            if os.path.exists(temp_path):
                os.unlink(temp_path)
            
    except Exception as e:
        logger.error(f"Transcription error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


# ============== Speaker Diarization ==============

@app.route('/enroll', methods=['POST'])
def enroll_speaker():
    """
    Enroll a new speaker by extracting voice embeddings
    
    Request body:
    {
        "speaker_id": "alice",
        "audio_data": "<base64 encoded audio>"
    }
    
    Response:
    {
        "success": true,
        "speaker_id": "alice",
        "embedding_size": 512
    }
    """
    try:
        data = request.json
        speaker_id = data.get('speaker_id')
        audio_b64 = data.get('audio_data')
        
        if not speaker_id or not audio_b64:
            return jsonify({'error': 'speaker_id and audio_data required'}), 400
        
        # Decode audio
        audio_bytes = base64.b64decode(audio_b64)
        
        # Write to temp file
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
            f.write(audio_bytes)
            temp_path = f.name
        
        try:
            # Extract embedding using pyannote
            import torch
            import torchaudio
            from pyannote.audio import Model, Inference
            
            # Load or get cached embedding model
            if 'pyannote_model' not in globals():
                global pyannote_model
                pyannote_model = Model.from_pretrained(
                    "pyannote/embedding",
                    use_auth_token=os.environ.get('HF_TOKEN')
                )
                pyannote_inference = Inference(pyannote_model, window="whole")
            
            # Load audio
            waveform, sample_rate = torchaudio.load(temp_path)
            
            # Resample if needed
            if sample_rate != 16000:
                resampler = torchaudio.transforms.Resample(sample_rate, 16000)
                waveform = resampler(waveform)
            
            # Extract embedding
            embedding = pyannote_inference({"waveform": waveform, "sample_rate": 16000})
            
            # Store embedding
            speaker_embeddings[speaker_id] = embedding.numpy()
            
            return jsonify({
                'success': True,
                'speaker_id': speaker_id,
                'embedding_size': len(embedding)
            })
        finally:
            os.unlink(temp_path)
            
    except Exception as e:
        logger.error(f"Enrollment error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/diarize', methods=['POST'])
def diarize():
    """
    Identify speaker from audio segment
    
    Request body:
    {
        "audio_data": "<base64 encoded audio>"
    }
    
    Response:
    {
        "speaker_id": "alice",
        "confidence": 0.87,
        "alternatives": [...]
    }
    """
    try:
        data = request.json
        audio_b64 = data.get('audio_data')
        
        if not audio_b64:
            return jsonify({'error': 'No audio data provided'}), 400
        
        if not speaker_embeddings:
            return jsonify({'error': 'No speakers enrolled'}), 400
        
        # Decode audio
        audio_bytes = base64.b64decode(audio_b64)
        
        # Write to temp file
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
            f.write(audio_bytes)
            temp_path = f.name
        
        try:
            import torch
            import torchaudio
            import numpy as np
            from scipy.spatial.distance import cosine
            
            # Load audio
            waveform, sample_rate = torchaudio.load(temp_path)
            
            # Resample if needed
            if sample_rate != 16000:
                resampler = torchaudio.transforms.Resample(sample_rate, 16000)
                waveform = resampler(waveform)
            
            # Extract embedding
            if 'pyannote_inference' not in globals():
                return jsonify({'error': 'Pyannote model not initialized'}), 500
                
            embedding = pyannote_inference({"waveform": waveform, "sample_rate": 16000})
            embedding_np = embedding.numpy()
            
            # Compare with enrolled speakers
            similarities = []
            for speaker_id, ref_embedding in speaker_embeddings.items():
                similarity = 1 - cosine(embedding_np, ref_embedding)
                similarities.append({
                    'speaker_id': speaker_id,
                    'confidence': float(similarity)
                })
            
            # Sort by confidence
            similarities.sort(key=lambda x: x['confidence'], reverse=True)
            
            best_match = similarities[0]
            
            return jsonify({
                'speaker_id': best_match['speaker_id'],
                'confidence': best_match['confidence'],
                'alternatives': similarities[1:4]  # Top 3 alternatives
            })
        finally:
            os.unlink(temp_path)
            
    except Exception as e:
        logger.error(f"Diarization error: {e}")
        return jsonify({'error': str(e)}), 500


# ============== Intent Detection ==============

@app.route('/detect_intent', methods=['POST'])
def detect_intent():
    """
    Detect if player speech requires DM response
    
    Request body:
    {
        "text": "What do I see in the room?"
    }
    
    Response:
    {
        "should_respond": true,
        "confidence": 0.92,
        "intent_type": "question"
    }
    """
    try:
        data = request.json
        text = data.get('text', '')
        threshold = data.get('threshold', 0.75)
        
        if not text:
            return jsonify({'should_respond': False, 'confidence': 0})
        
        model = get_embedding_model()
        
        # Trigger phrases that should prompt DM response
        trigger_phrases = [
            "What do I see?",
            "I want to roll",
            "I attack",
            "I search the room",
            "What happens?",
            "Can I do",
            "I try to",
            "I cast a spell",
            "I move to",
            "Is there anything",
            "Do I notice",
            "I want to talk to",
            "What does the NPC say?",
            "I open the door",
            "I pick up",
            "I examine",
            "Tell me about",
            "Describe the",
            "I ask the",
            "What's in"
        ]
        
        # Get embeddings
        text_embedding = model.encode([text])[0]
        trigger_embeddings = model.encode(trigger_phrases)
        
        # Calculate similarities
        from scipy.spatial.distance import cosine
        similarities = [1 - cosine(text_embedding, te) for te in trigger_embeddings]
        max_similarity = max(similarities)
        
        # Determine intent type
        intent_type = "unknown"
        if max_similarity > threshold:
            if any(q in text.lower() for q in ['what', 'where', 'who', 'how', 'why', 'when', '?']):
                intent_type = "question"
            elif any(a in text.lower() for a in ['attack', 'hit', 'strike', 'fight']):
                intent_type = "combat_action"
            elif any(s in text.lower() for s in ['cast', 'spell', 'magic']):
                intent_type = "spell_cast"
            else:
                intent_type = "action"
        
        return jsonify({
            'should_respond': max_similarity > threshold,
            'confidence': float(max_similarity),
            'intent_type': intent_type
        })
        
    except Exception as e:
        logger.error(f"Intent detection error: {e}")
        return jsonify({'error': str(e)}), 500


# ============== Knowledge Base (RAG) ==============

@app.route('/add_knowledge', methods=['POST'])
def add_knowledge():
    """
    Add knowledge to the campaign RAG database
    
    Request body:
    {
        "id": "unique-id",
        "category": "npc",
        "title": "Thorgrim the Blacksmith",
        "content": "A gruff dwarf who runs the forge...",
        "tags": ["ally", "shop"]
    }
    """
    try:
        data = request.json
        
        entry_id = data.get('id')
        category = data.get('category', 'general')
        title = data.get('title', '')
        content = data.get('content', '')
        tags = data.get('tags', [])
        
        if not entry_id or not content:
            return jsonify({'error': 'id and content required'}), 400
        
        collection = get_chroma_collection()
        
        # Add to ChromaDB
        collection.upsert(
            ids=[entry_id],
            documents=[f"{title}\n\n{content}"],
            metadatas=[{
                'category': category,
                'title': title,
                'tags': ','.join(tags)
            }]
        )
        
        return jsonify({'success': True, 'id': entry_id})
        
    except Exception as e:
        logger.error(f"Add knowledge error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/search_knowledge', methods=['POST'])
def search_knowledge():
    """
    Search campaign knowledge base
    
    Request body:
    {
        "query": "Who can repair my sword?",
        "n_results": 5,
        "min_similarity": 0.7
    }
    """
    try:
        data = request.json
        query = data.get('query', '')
        n_results = data.get('n_results', 5)
        
        if not query:
            return jsonify({'results': []})
        
        collection = get_chroma_collection()
        
        results = collection.query(
            query_texts=[query],
            n_results=n_results
        )
        
        formatted_results = []
        if results['documents'] and results['documents'][0]:
            for i, doc in enumerate(results['documents'][0]):
                metadata = results['metadatas'][0][i] if results['metadatas'] else {}
                distance = results['distances'][0][i] if results['distances'] else 0
                similarity = 1 - distance  # Convert distance to similarity
                
                formatted_results.append({
                    'id': results['ids'][0][i],
                    'content': doc,
                    'title': metadata.get('title', ''),
                    'category': metadata.get('category', ''),
                    'tags': metadata.get('tags', '').split(','),
                    'similarity': similarity
                })
        
        return jsonify({'results': formatted_results})
        
    except Exception as e:
        logger.error(f"Search knowledge error: {e}")
        return jsonify({'error': str(e)}), 500


# ============== Text-to-Speech ==============

@app.route('/synthesize', methods=['POST'])
def synthesize_speech():
    """
    Synthesize speech from text
    
    Request body:
    {
        "text": "Welcome to the dungeon, adventurers!",
        "voice": "default",
        "speed": 1.0
    }
    
    Response: audio/wav binary
    """
    try:
        data = request.json
        text = data.get('text', '')
        voice = data.get('voice', 'default')
        speed = data.get('speed', 1.0)
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        tts = get_tts_engine()
        if tts is None:
            return jsonify({'error': 'TTS engine not available'}), 503
        
        # Generate speech to temp file
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
            temp_path = f.name
        
        try:
            tts.tts_to_file(text=text, file_path=temp_path, speed=speed)
            
            # Read and return as base64
            with open(temp_path, 'rb') as f:
                audio_data = f.read()
            
            return jsonify({
                'audio_data': base64.b64encode(audio_data).decode('utf-8'),
                'format': 'wav'
            })
        finally:
            if os.path.exists(temp_path):
                os.unlink(temp_path)
                
    except Exception as e:
        logger.error(f"TTS error: {e}")
        return jsonify({'error': str(e)}), 500


# ============== Main ==============

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='AI DM Listener Python Service')
    parser.add_argument('--port', type=int, default=5000, help='Port to run on')
    parser.add_argument('--host', default='127.0.0.1', help='Host to bind to')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode')
    parser.add_argument('--preload', action='store_true', help='Preload all models on startup')
    
    args = parser.parse_args()
    
    if args.preload:
        logger.info("Preloading models...")
        get_whisper_model()
        get_embedding_model()
        get_chroma_collection()
        get_tts_engine()
        logger.info("All models loaded")
    
    logger.info(f"Starting AI DM Listener Python Service on {args.host}:{args.port}")
    app.run(host=args.host, port=args.port, debug=args.debug)
