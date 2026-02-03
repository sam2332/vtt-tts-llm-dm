"""
Test script for debugging Whisper transcription
"""

import os
import sys
import subprocess
import tempfile
import wave
import struct
import math

def check_ffmpeg():
    """Check if ffmpeg is available"""
    print("=" * 50)
    print("Checking ffmpeg installation...")
    try:
        result = subprocess.run(['ffmpeg', '-version'], capture_output=True, text=True)
        print("✓ ffmpeg is installed")
        # Print first line of version info
        print(f"  Version: {result.stdout.split(chr(10))[0]}")
        return True
    except FileNotFoundError:
        print("✗ ffmpeg is NOT installed or not in PATH")
        print("  Install with: winget install Gyan.FFmpeg")
        return False

def check_whisper():
    """Check if whisper is available"""
    print("\n" + "=" * 50)
    print("Checking whisper installation...")
    try:
        import whisper
        print("✓ whisper module is installed")
        print(f"  Version: {whisper.__version__ if hasattr(whisper, '__version__') else 'unknown'}")
        return True
    except ImportError as e:
        print(f"✗ whisper is NOT installed: {e}")
        print("  Install with: pip install openai-whisper")
        return False

def generate_test_audio(filepath, duration=2, frequency=440):
    """Generate a simple test audio file (sine wave)"""
    print(f"\nGenerating test audio file: {filepath}")
    sample_rate = 16000
    num_samples = int(sample_rate * duration)
    
    with wave.open(filepath, 'w') as wav_file:
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(sample_rate)
        
        for i in range(num_samples):
            # Generate silence (for testing, whisper should return empty or minimal text)
            sample = int(32767 * 0.1 * math.sin(2 * math.pi * frequency * i / sample_rate))
            wav_file.writeframes(struct.pack('<h', sample))
    
    print(f"✓ Generated {duration}s test audio at {sample_rate}Hz")
    return filepath

def test_whisper_transcription():
    """Test whisper transcription with a generated audio file"""
    print("\n" + "=" * 50)
    print("Testing Whisper transcription...")
    
    try:
        import whisper
        
        # Create a temporary audio file
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
            temp_path = f.name
        
        try:
            # Generate test audio
            generate_test_audio(temp_path)
            
            # Load model
            print("\nLoading Whisper model (base.en)...")
            model = whisper.load_model("base.en")
            print("✓ Model loaded successfully")
            
            # Transcribe
            print("\nTranscribing test audio...")
            result = model.transcribe(temp_path, language='en')
            print("✓ Transcription completed")
            print(f"  Text: '{result['text'].strip()}'")
            print(f"  Language: {result.get('language', 'unknown')}")
            
            return True
            
        finally:
            # Cleanup
            if os.path.exists(temp_path):
                os.unlink(temp_path)
                print(f"\n✓ Cleaned up temp file")
                
    except Exception as e:
        print(f"✗ Transcription failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_flask_service():
    """Test if the Flask service is responding"""
    print("\n" + "=" * 50)
    print("Testing Flask service...")
    
    try:
        import requests
        response = requests.get('http://127.0.0.1:5000/health', timeout=5)
        if response.status_code == 200:
            print("✓ Flask service is running")
            print(f"  Response: {response.json()}")
            return True
        else:
            print(f"✗ Flask service returned status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("✗ Flask service is not running or not reachable")
        print("  Make sure the Electron app is running (npm run dev)")
        return False
    except ImportError:
        print("✗ requests module not installed")
        print("  Install with: pip install requests")
        return False

def test_transcribe_endpoint():
    """Test the /transcribe endpoint with real audio"""
    print("\n" + "=" * 50)
    print("Testing /transcribe endpoint...")
    
    try:
        import requests
        import base64
        
        # Generate test audio
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
            temp_path = f.name
        
        try:
            generate_test_audio(temp_path, duration=1)
            
            # Read and encode the audio
            with open(temp_path, 'rb') as f:
                audio_data = base64.b64encode(f.read()).decode('utf-8')
            
            # Send to endpoint
            print("\nSending audio to /transcribe endpoint...")
            response = requests.post(
                'http://127.0.0.1:5000/transcribe',
                json={'audio_data': audio_data},
                timeout=30
            )
            
            if response.status_code == 200:
                print("✓ Transcription endpoint working")
                print(f"  Response: {response.json()}")
                return True
            else:
                print(f"✗ Endpoint returned status {response.status_code}")
                print(f"  Error: {response.text}")
                return False
                
        finally:
            if os.path.exists(temp_path):
                os.unlink(temp_path)
                
    except Exception as e:
        print(f"✗ Endpoint test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("=" * 50)
    print("  AI DM Listener - Whisper Debug Test")
    print("=" * 50)
    
    results = {}
    
    # Run all checks
    results['ffmpeg'] = check_ffmpeg()
    results['whisper'] = check_whisper()
    
    if results['ffmpeg'] and results['whisper']:
        results['transcription'] = test_whisper_transcription()
    else:
        print("\n⚠ Skipping transcription test due to missing dependencies")
        results['transcription'] = False
    
    results['flask'] = test_flask_service()
    
    if results['flask']:
        results['endpoint'] = test_transcribe_endpoint()
    else:
        print("\n⚠ Skipping endpoint test - Flask service not running")
        results['endpoint'] = False
    
    # Summary
    print("\n" + "=" * 50)
    print("  SUMMARY")
    print("=" * 50)
    for test, passed in results.items():
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"  {test}: {status}")
    
    all_passed = all(results.values())
    print("\n" + ("All tests passed! ✓" if all_passed else "Some tests failed ✗"))
    
    return 0 if all_passed else 1

if __name__ == '__main__':
    sys.exit(main())
