/* 
* Soundbox Player 
*
* Copyright (c) 2011-2013 Marcus Geelnard
*
* This software is provided 'as-is', without any express or implied
* warranty. In no event will the authors be held liable for any damages
* arising from the use of this software.
*
* Permission is granted to anyone to use this software for any purpose,
* including commercial applications, and to alter it and redistribute it
* freely, subject to the following restrictions:
*
* 1. The origin of this software must not be misrepresented; you must not
*    claim that you wrote the original software. If you use this software
*    in a product, an acknowledgment in the product documentation would be
*    appreciated but is not required.
*
* 2. Altered source versions must be plainly marked as such, and must not be
*    misrepresented as being the original software.
*
* 3. This notice may not be removed or altered from any source
*    distribution.
*
*/

var CPlayer = function() {

    //--------------------------------------------------------------------------
    // Private methods
    //--------------------------------------------------------------------------

    // Oscillators
    var osc_sin = function (value) {
        return Math.sin(value * 6.283184);
    };

    var osc_saw = function (value) {
        return 2 * (value % 1) - 1;
    };

    var osc_square = function (value) {
        return (value % 1) < 0.5 ? 1 : -1;
    };

    var osc_tri = function (value) {
        var v2 = (value % 1) * 4;
        if(v2 < 2) return v2 - 1;
        return 3 - v2;
    };

    var getnotefreq = function (n) {
        // 174.61.. / 44100 = 0.003959503758 (F3)
        return 0.003959503758 * Math.pow(2, (n - 128) / 12);
    };

    var createNote = function (instr, n, rowLen) {
        var osc1 = mOscillators[instr.i[0]],
            o1vol = instr.i[1],
            o1xenv = instr.i[3],
            osc2 = mOscillators[instr.i[4]],
            o2vol = instr.i[5],
            o2xenv = instr.i[8],
            noiseVol = instr.i[9],
            attack = instr.i[10] * instr.i[10] * 4,
            sustain = instr.i[11] * instr.i[11] * 4,
            release = instr.i[12] * instr.i[12] * 4,
            releaseInv = 1 / release,
            arp = instr.i[13],
            arpInterval = rowLen * Math.pow(2, 2 - instr.i[14]);

        var noteBuf = new Int32Array(attack + sustain + release);

        // Re-trig oscillators
        var c1 = 0, c2 = 0;

        // Local variables.
        var j, j2, e, t, rsample, o1t, o2t;

        // Generate one note (attack + sustain + release)
        for (j = 0, j2 = 0; j < attack + sustain + release; j++, j2++) {
            if (j2 >= 0) {
                // Switch arpeggio note.
                arp = (arp >> 8) | ((arp & 255) << 4);
                j2 -= arpInterval;

                // Calculate note frequencies for the oscillators
                o1t = getnotefreq(n + (arp & 15) + instr.i[2] - 128);
                o2t = getnotefreq(n + (arp & 15) + instr.i[6] - 128) * (1 + 0.0008 * instr.i[7]);
            }

            // Envelope
            e = 1;
            if (j < attack) {
                e = j / attack;
            } else if (j >= attack + sustain) {
                e -= (j - attack - sustain) * releaseInv;
            }

            // Oscillator 1
            t = o1t;
            if (o1xenv) {
                t *= e * e;
            }
            c1 += t;
            rsample = osc1(c1) * o1vol;

            // Oscillator 2
            t = o2t;
            if (o2xenv) {
                t *= e * e;
            }
            c2 += t;
            rsample += osc2(c2) * o2vol;

            // Noise oscillator
            if (noiseVol) {
                rsample += (2 * Math.random() - 1) * noiseVol;
            }

            // Add to (mono) channel buffer
            noteBuf[j] = (80 * rsample * e) | 0;
        }

        return noteBuf;
    };


    //--------------------------------------------------------------------------
    // Private members
    //--------------------------------------------------------------------------

    // Array of oscillator functions
    var mOscillators = [
        osc_sin,
        osc_square,
        osc_saw,
        osc_tri
    ];

    // Private variables set up by init()
    var mSong, mLastRow, mCurrentCol, mNumWords, mMixBuf;


    //--------------------------------------------------------------------------
    // Initialization
    //--------------------------------------------------------------------------

    this.init = function (song) {
        // Define the song
        mSong = song;

        // Init iteration state variables
        mLastRow = song.endPattern;
        mCurrentCol = 0;

        // Prepare song info
        mNumWords =  song.rowLen * song.patternLen * (mLastRow + 1) * 2;

        // Create work buffer (initially cleared)
        mMixBuf = new Int32Array(mNumWords);
    };


    //--------------------------------------------------------------------------
    // Public methods
    //--------------------------------------------------------------------------

    // Generate audio data for a single track
    this.generate = function () {
        // Local variables
        var i, j, b, p, row, col, n, cp,
            k, t, lfor, e, x, rsample, rowStartSample, f, da;

        // Put performance critical items in local variables
        var chnBuf = new Int32Array(mNumWords),
            instr = mSong.songData[mCurrentCol],
            rowLen = mSong.rowLen,
            patternLen = mSong.patternLen;

        // Clear effect state
        var low = 0, band = 0, high;
        var lsample, filterActive = false;

        // Clear note cache.
        var noteCache = [];

         // Patterns
         for (p = 0; p <= mLastRow; ++p) {
            cp = instr.p[p];

            // Pattern rows
            for (row = 0; row < patternLen; ++row) {
                // Execute effect command.
                var cmdNo = cp ? instr.c[cp - 1].f[row] : 0;
                if (cmdNo) {
                    instr.i[cmdNo - 1] = instr.c[cp - 1].f[row + patternLen] || 0;

                    // Clear the note cache since the instrument has changed.
                    if (cmdNo < 16) {
                        noteCache = [];
                    }
                }

                // Put performance critical instrument properties in local variables
                var oscLFO = mOscillators[instr.i[15]],
                    lfoAmt = instr.i[16] / 512,
                    lfoFreq = Math.pow(2, instr.i[17] - 9) / rowLen,
                    fxLFO = instr.i[18],
                    fxFilter = instr.i[19],
                    fxFreq = instr.i[20] * 43.23529 * 3.141592 / 44100,
                    q = 1 - instr.i[21] / 255,
                    dist = instr.i[22] * 1e-5,
                    drive = instr.i[23] / 32,
                    panAmt = instr.i[24] / 512,
                    panFreq = 6.283184 * Math.pow(2, instr.i[25] - 9) / rowLen,
                    dlyAmt = instr.i[26] / 255,
                    dly = instr.i[27] * rowLen & ~1;  // Must be an even number

                // Calculate start sample number for this row in the pattern
                rowStartSample = (p * patternLen + row) * rowLen;

                // Generate notes for this pattern row
                for (col = 0; col < 4; ++col) {
                    n = cp ? instr.c[cp - 1].n[row + col * patternLen] : 0;
                    if (n) {
                        if (!noteCache[n]) {
                            noteCache[n] = createNote(instr, n, rowLen);
                        }

                        // Copy note from the note cache
                        var noteBuf = noteCache[n];
                        for (j = 0, i = rowStartSample * 2; j < noteBuf.length; j++, i += 2) {
                          chnBuf[i] += noteBuf[j];
                        }
                    }
                }

                // Perform effects for this pattern row
                for (j = 0; j < rowLen; j++) {
                    // Dry mono-sample
                    k = (rowStartSample + j) * 2;
                    rsample = chnBuf[k];

                    // We only do effects if we have some sound input
                    if (rsample || filterActive) {
                        // State variable filter
                        f = fxFreq;
                        if (fxLFO) {
                            f *= oscLFO(lfoFreq * k) * lfoAmt + 0.5;
                        }
                        f = 1.5 * Math.sin(f);
                        low += f * band;
                        high = q * (rsample - band) - low;
                        band += f * high;
                        rsample = fxFilter == 3 ? band : fxFilter == 1 ? high : low;

                        // Distortion
                        if (dist) {
                            rsample *= dist;
                            rsample = rsample < 1 ? rsample > -1 ? osc_sin(rsample*.25) : -1 : 1;
                            rsample /= dist;
                        }

                        // Drive
                        rsample *= drive;

                        // Is the filter active (i.e. still audiable)?
                        filterActive = rsample * rsample > 1e-5;

                        // Panning
                        t = Math.sin(panFreq * k) * panAmt + 0.5;
                        lsample = rsample * (1 - t);
                        rsample *= t;
                    } else {
                        lsample = 0;
                    }

                    // Delay is always done, since it does not need sound input
                    if (k >= dly) {
                        // Left channel = left + right[-p] * t
                        lsample += chnBuf[k-dly+1] * dlyAmt;

                        // Right channel = right + left[-p] * t
                        rsample += chnBuf[k-dly] * dlyAmt;
                    }

                    // Store in stereo channel buffer (needed for the delay effect)
                    chnBuf[k] = lsample | 0;
                    chnBuf[k+1] = rsample | 0;

                    // ...and add to stereo mix buffer
                    mMixBuf[k] += lsample | 0;
                    mMixBuf[k+1] += rsample | 0;
                }
            }
        }

        // Next iteration. Return progress (1.0 == done!).
        mCurrentCol++;
        return mCurrentCol / mSong.numChannels;
    };

    // Create a WAVE formatted Uint8Array from the generated audio data
    this.createWave = function() {
        // Create WAVE header
        var headerLen = 44;
        var l1 = headerLen + mNumWords * 2 - 8;
        var l2 = l1 - 36;
        var wave = new Uint8Array(headerLen + mNumWords * 2);
        wave.set(
            [82,73,70,70,
             l1 & 255,(l1 >> 8) & 255,(l1 >> 16) & 255,(l1 >> 24) & 255,
             87,65,86,69,102,109,116,32,16,0,0,0,1,0,2,0,
             68,172,0,0,16,177,2,0,4,0,16,0,100,97,116,97,
             l2 & 255,(l2 >> 8) & 255,(l2 >> 16) & 255,(l2 >> 24) & 255]
        );

        // Append actual wave data
        for (var i = 0, idx = headerLen; i < mNumWords; ++i) {
            // Note: We clamp here
            var y = mMixBuf[i];
            y = y < -32767 ? -32767 : (y > 32767 ? 32767 : y);
            wave[idx++] = y & 255;
            wave[idx++] = (y >> 8) & 255;
        }

        // Return the WAVE formatted typed array
        return wave;
    };

    // Get n samples of wave data at time t [s]. Wave data in range [-2,2].
    this.getData = function(t, n) {
        var i = 2 * Math.floor(t * 44100);
        var d = new Array(n);
        for (var j = 0; j < 2*n; j += 1) {
            var k = i + j;
            d[j] = t > 0 && k < mMixBuf.length ? mMixBuf[k] / 32768 : 0;
        }
        return d;
    };
};

// -- End of soundbox player

// Space Aces - Song by Ryan Malm or @ryanmalm <3 <3

var song = {
  songData: [
    { // Instrument 0
      i: [
      1, // OSC1_WAVEFORM
      69, // OSC1_VOL
      128, // OSC1_SEMI
      0, // OSC1_XENV
      1, // OSC2_WAVEFORM
      96, // OSC2_VOL
      116, // OSC2_SEMI
      9, // OSC2_DETUNE
      0, // OSC2_XENV
      0, // NOISE_VOL
      6, // ENV_ATTACK
      29, // ENV_SUSTAIN
      34, // ENV_RELEASE
      0, // ARP_CHORD
      0, // ARP_SPEED
      0, // LFO_WAVEFORM
      69, // LFO_AMT
      3, // LFO_FREQ
      1, // LFO_FX_FREQ
      1, // FX_FILTER
      23, // FX_FREQ
      167, // FX_RESONANCE
      0, // FX_DIST
      32, // FX_DRIVE
      77, // FX_PAN_AMT
      6, // FX_PAN_FREQ
      20, // FX_DELAY_AMT
      4 // FX_DELAY_TIME
      ],
      // Patterns
      p: [1,1,3,3],
      // Columns
      c: [
        {n: [151,152,154,159,,151,154,159,157,,156,,154,,152,,151,152,154,147,,147,142,147,145,,144,,142,,140,,147,149,151,154,,147,151,154,152,,151,,149,,149,,147,149,151,142,,142,139,142,140,,139,,137,,137],
         f: []},
        {n: [144,146,147,144,,147,146,144,146,149,147,146,,149,147,146,147,146,144,139,,147,146,144,139,,140,,142,,139],
         f: []},
        {n: [147,146,144,139,,144,146,147,151,149,147,144,,147,149,151,152,151,149,144,,144,146,147,147,,146,,144,,142,,144,142,139,135,,139,140,142,147,146,144,139,,139,140,142,144,142,140,137,,137,139,140,142,,140,,139,,137],
         f: []}
      ]
    },
    { // Instrument 1
      i: [
      0, // OSC1_WAVEFORM
      100, // OSC1_VOL
      128, // OSC1_SEMI
      0, // OSC1_XENV
      3, // OSC2_WAVEFORM
      201, // OSC2_VOL
      128, // OSC2_SEMI
      0, // OSC2_DETUNE
      0, // OSC2_XENV
      0, // NOISE_VOL
      0, // ENV_ATTACK
      19, // ENV_SUSTAIN
      29, // ENV_RELEASE
      0, // ARP_CHORD
      0, // ARP_SPEED
      0, // LFO_WAVEFORM
      195, // LFO_AMT
      4, // LFO_FREQ
      1, // LFO_FX_FREQ
      3, // FX_FILTER
      50, // FX_FREQ
      184, // FX_RESONANCE
      119, // FX_DIST
      244, // FX_DRIVE
      147, // FX_PAN_AMT
      6, // FX_PAN_FREQ
      84, // FX_DELAY_AMT
      6 // FX_DELAY_TIME
      ],
      // Patterns
      p: [1,1,2,2],
      // Columns
      c: [
        {n: [111,,111,,111,111,,111,,111,,111,111,,111,,111,,111,,111,111,,111,,111,,111,111,,111],
         f: []},
        {n: [108,,108,,108,108,,108,,108,,108,108,,108,,113,,113,,113,113,,118,,118,,118,118,,118],
         f: []}
      ]
    },
    { // Instrument 2
      i: [
      2, // OSC1_WAVEFORM
      91, // OSC1_VOL
      128, // OSC1_SEMI
      0, // OSC1_XENV
      2, // OSC2_WAVEFORM
      93, // OSC2_VOL
      140, // OSC2_SEMI
      18, // OSC2_DETUNE
      0, // OSC2_XENV
      0, // NOISE_VOL
      158, // ENV_ATTACK
      119, // ENV_SUSTAIN
      158, // ENV_RELEASE
      0, // ARP_CHORD
      0, // ARP_SPEED
      0, // LFO_WAVEFORM
      0, // LFO_AMT
      0, // LFO_FREQ
      0, // LFO_FX_FREQ
      2, // FX_FILTER
      5, // FX_FREQ
      0, // FX_RESONANCE
      0, // FX_DIST
      32, // FX_DRIVE
      0, // FX_PAN_AMT
      0, // FX_PAN_FREQ
      24, // FX_DELAY_AMT
      8 // FX_DELAY_TIME
      ],
      // Patterns
      p: [],
      // Columns
      c: [
      ]
    },
    { // Instrument 3
      i: [
      0, // OSC1_WAVEFORM
      160, // OSC1_VOL
      128, // OSC1_SEMI
      1, // OSC1_XENV
      0, // OSC2_WAVEFORM
      160, // OSC2_VOL
      128, // OSC2_SEMI
      0, // OSC2_DETUNE
      1, // OSC2_XENV
      210, // NOISE_VOL
      4, // ENV_ATTACK
      7, // ENV_SUSTAIN
      41, // ENV_RELEASE
      0, // ARP_CHORD
      0, // ARP_SPEED
      0, // LFO_WAVEFORM
      60, // LFO_AMT
      4, // LFO_FREQ
      1, // LFO_FX_FREQ
      2, // FX_FILTER
      255, // FX_FREQ
      0, // FX_RESONANCE
      0, // FX_DIST
      32, // FX_DRIVE
      61, // FX_PAN_AMT
      5, // FX_PAN_FREQ
      32, // FX_DELAY_AMT
      6 // FX_DELAY_TIME
      ],
      // Patterns
      p: [1,1,1,1],
      // Columns
      c: [
        {n: [,,,,111,,,,,,,,111,,,,,,,,111,,,,,,,,111],
         f: []}
      ]
    },
    { // Instrument 4
      i: [
      0, // OSC1_WAVEFORM
      0, // OSC1_VOL
      140, // OSC1_SEMI
      0, // OSC1_XENV
      0, // OSC2_WAVEFORM
      0, // OSC2_VOL
      140, // OSC2_SEMI
      0, // OSC2_DETUNE
      0, // OSC2_XENV
      60, // NOISE_VOL
      4, // ENV_ATTACK
      10, // ENV_SUSTAIN
      34, // ENV_RELEASE
      0, // ARP_CHORD
      0, // ARP_SPEED
      0, // LFO_WAVEFORM
      187, // LFO_AMT
      5, // LFO_FREQ
      0, // LFO_FX_FREQ
      1, // FX_FILTER
      239, // FX_FREQ
      135, // FX_RESONANCE
      0, // FX_DIST
      32, // FX_DRIVE
      108, // FX_PAN_AMT
      5, // FX_PAN_FREQ
      16, // FX_DELAY_AMT
      4 // FX_DELAY_TIME
      ],
      // Patterns
      p: [1,1,1,1],
      // Columns
      c: [
        {n: [111,,111,,111,,111,,111,,111,,111,,111,,111,,111,,111,,111,,111,,111,,111,,111],
         f: []}
      ]
    },
  ],
  rowLen: 5088,   // In sample lengths
  patternLen: 32,  // Rows per pattern
  endPattern: 3,  // End pattern
  numChannels: 5  // Number of channels
};

// Pasted SFXR
function SfxrParams(){this.setSettings=function(t){for(var r=0;24>r;r++)this[String.fromCharCode(97+r)]=t[r]||0;this.c<.01&&(this.c=.01);var e=this.b+this.c+this.e;if(.18>e){var a=.18/e;this.b*=a,this.c*=a,this.e*=a}}}function SfxrSynth(){this.a=new SfxrParams;var t,r,e,a,s,n,i,h,f,c,o,v;this.reset=function(){var t=this.a;a=100/(t.f*t.f+.001),s=100/(t.g*t.g+.001),n=1-t.h*t.h*t.h*.01,i=-t.i*t.i*t.i*1e-6,t.a||(o=.5-t.n/2,v=5e-5*-t.o),h=1+t.l*t.l*(t.l>0?-.9:10),f=0,c=1==t.m?0:(1-t.m)*(1-t.m)*2e4+32},this.totalReset=function(){this.reset();var a=this.a;return t=a.b*a.b*1e5,r=a.c*a.c*1e5,e=a.e*a.e*1e5+12,3*((t+r+e)/3|0)},this.synthWave=function(u,b){var w=this.a,y=1024,g=1!=w.s||w.v,k=w.v*w.v*.1,S=1+3e-4*w.w,l=w.s*w.s*w.s*.1,m=1+1e-4*w.t,d=1!=w.s,x=w.x*w.x,A=w.g,q=w.q||w.r,M=w.r*w.r*w.r*.2,p=w.q*w.q*(w.q<0?-1020:1020),U=w.p?((1-w.p)*(1-w.p)*2e4|0)+32:0,j=w.d,C=w.j/2,P=w.k*w.k*.01,R=w.a,W=t,z=1/t,B=1/r,D=1/e,E=5/(1+w.u*w.u*20)*(.01+l);E>.8&&(E=.8),E=1-E;var F,G,H,I,J,K,L,N=!1,O=0,Q=0,T=0,V=0,X=0,Y=0,Z=0,$=0,_=0,tt=0,rt=new Array(y),et=new Array(32);for(L=rt.length;L--;)rt[L]=0;for(L=et.length;L--;)et[L]=2*Math.random()-1;for(L=0;b>L;L++){if(N)return L;if(U&&++_>=U&&(_=0,this.reset()),c&&++f>=c&&(c=0,a*=h),n+=i,a*=n,a>s&&(a=s,A>0&&(N=!0)),G=a,C>0&&(tt+=P,G*=1+Math.sin(tt)*C),G|=0,8>G&&(G=8),R||(o+=v,0>o?o=0:o>.5&&(o=.5)),++Q>W)switch(Q=0,++O){case 1:W=r;break;case 2:W=e}switch(O){case 0:T=Q*z;break;case 1:T=1+2*(1-Q*B)*j;break;case 2:T=1-Q*D;break;case 3:T=0,N=!0}q&&(p+=M,H=0|p,0>H?H=-H:H>y-1&&(H=y-1)),g&&S&&(k*=S,1e-5>k?k=1e-5:k>.1&&(k=.1)),K=0;for(var at=8;at--;){if(Z++,Z>=G&&(Z%=G,3==R))for(var st=et.length;st--;)et[st]=2*Math.random()-1;switch(R){case 0:J=o>Z/G?.5:-.5;break;case 1:J=1-Z/G*2;break;case 2:I=Z/G,I=6.28318531*(I>.5?I-1:I),J=1.27323954*I+.405284735*I*I*(0>I?1:-1),J=.225*((0>J?-1:1)*J*J-J)+J;break;case 3:J=et[Math.abs(32*Z/G|0)]}g&&(F=Y,l*=m,0>l?l=0:l>.1&&(l=.1),d?(X+=(J-Y)*l,X*=E):(Y=J,X=0),Y+=X,V+=Y-F,V*=1-k,J=V),q&&(rt[$%y]=J,J+=rt[($-H+y)%y],$++),K+=J}K*=.125*T*x,u[L]=K>=1?32767:-1>=K?-32768:32767*K|0}return b}}var synth=new SfxrSynth;window.jsfxr=function(t){synth.a.setSettings(t);var r=synth.totalReset(),e=new Uint8Array(4*((r+1)/2|0)+44),a=2*synth.synthWave(new Uint16Array(e.buffer,44),r),s=new Uint32Array(e.buffer,0,44);s[0]=1179011410,s[1]=a+36,s[2]=1163280727,s[3]=544501094,s[4]=16,s[5]=65537,s[6]=44100,s[7]=88200,s[8]=1048578,s[9]=1635017060,s[10]=a,a+=44;for(var n=0,i="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",h="data:audio/wav;base64,";a>n;n+=3){var f=e[n]<<16|e[n+1]<<8|e[n+2];h+=i[f>>18]+i[f>>12&63]+i[f>>6&63]+i[63&f]}return h};

// --- Initialization

var gState = 0;
var themeAudio;

var player = new CPlayer();
player.init(song);
// Generate music...
var done = false;
setInterval(function () {
  if (done) {
    return;
  }
  done = player.generate() >= 1;
  if (done) {
    var wave = player.createWave();
    themeAudio = document.createElement("audio");
    themeAudio.loop=true;
    themeAudio.src = URL.createObjectURL(new Blob([wave], {type: "audio/wav"}));
    title();
  }
}, 100);


///----
// Sound
let sounds = [
  // Explosion
  [3,,0.1179,0.6428,0.4267,0.7061,,-0.3837,,,,,,,,,,,1,,,,,0.5], // Explosion
  [1,,0.1158,0.1299,0.2666,0.5234,0.0722,-0.4074,,,,,,0.8704,-0.5509,,,,1,,,0.2165,,0.5],
  [3,,0.1427,0.2909,0.2542,0.2349,,-0.2076,,,,-0.3384,0.7392,,,,,,1,,,,,0.5], // Missile
  [3,,0.3314,0.7668,0.64,0.4086,,-0.372,,,,-0.0355,0.8905,,,0.3548,,,1,,,,,0.5], // Super explosion 3
  [1,,0.27,,0.57,0.22,,0.3404,,,,,,,,0.4458,,,1,,,,,0.5], // Start Game 4
];

var BS = 5;
sounds = sounds.map(a=>jsfxr(a)).map(j=>[...Array(BS).keys()].map(()=>new Audio(j)));
let playing = {};
let curr = [0,0,0,0,0];
function playSound(i){
  if (playing[i]){
    return;
  }
  playing[i] = true;
  var player = sounds[i][curr[i]++];
  if (curr[i] == BS){
    curr[i] = 0;
  }
  player.play();
  setTimeout(()=>playing[i]=false, 30);
}

// Random
var rand = {
  int: function(max) {
    return Math.random() * (max || 0xfffffff) | 0;
  },
  range: function(min, max) {
    return this.int(max - min) + min;
  },
  b() {
    return this.range(0,100)<50;
  }
};

// 1993 Park-Miller LCG, https://gist.github.com/blixt/f17b47c62508be59987b
function LCG(s) {
  return function() {
    s = Math.imul(16807, s) | 0 % 2147483647;
    return (s & 2147483647) / 2147483648;
  }
}

var seeded = LCG(13312);

var rands = {
  int: function(max) {
    return seeded() * (max || 0xfffffff) | 0;
  },
  range: function(min, max) {
    if (min === max) {
      return min;
    }
    return this.int(max - min) + min;
  },
  b() {
    return this.range(0,100)<50;
  }
};


// Input
var pressed = {};
var typedCallbacks = {};
function keyPress(e){
  if (typedCallbacks[e.which]){
    typedCallbacks[e.which]();
  }
}
window.onkeydown = e => pressed[e.which] = true;
window.onkeyup = e => pressed[e.which] = false;
window.addEventListener("keypress", keyPress);
window.addEventListener("keydown", e => {if([32, 37, 38, 39, 40].indexOf(e.keyCode) > -1) e.preventDefault();});
function isDown(keyCode){
  return pressed[keyCode];
};
function typed(keyCode, callback){
  typedCallbacks[keyCode] = callback;   
}

const Renderer = {
  render(c,ins,x,y,s,over,flip,scalex) {
    var sx = s
    if (scalex)
      sx = s * scalex;
    var xFlip = flip ? -1 : 1;
    c.fillStyle = over != undefined ? over : ins[0];
    var i = 1;
    drawlLine = false;
    c.globalAlpha = 1;
    while(i < ins.length + 2) {
      let co = ins[i++];
      switch (co) {
        case 'c':
          c.beginPath();
          c.arc(x,y,ins[i++]*s,0,Math.PI*2,true);
          c.fill();
          drawlLine = false;
          break;
        case 'p':
          c.strokeStyle = c.fillStyle;
          c.beginPath();
          c.moveTo(ins[i++]*sx*xFlip+x, ins[i++]*s+y);
          co = ins[i++];
          drawlLine = true;
          break;
        case 'f':
          c.fill();
          drawlLine = false;
          break;
        case 's':
          c.stroke();
          drawlLine = false;
          break;
        case 'a':
          c.globalAlpha = ins[i++];
          break;
        case 'o':
          c.fillStyle = over != undefined ? over : ins[i++];
          break;
        case 'v':
          c.save();
          c.beginPath();
          c.translate(x+ins[i++]*sx*xFlip, y+ins[i++]*s);
          c.scale(1, ins[i++]);
          c.arc(0, 0, ins[i++]*s, 0, 2 * Math.PI, false);
          c.restore(); // restore to original state
          break;
        case 'vh':
          c.save();
          c.beginPath();
          c.translate(x+ins[i++]*s*xFlip, y+ins[i++]*s);
          c.scale(1, ins[i++]);
          c.arc(0, 0, ins[i++]*s, ins[i++], ins[i++], false);
          c.restore();
          break;
        case 'm':
          co = ins[i++];
          drawlLine = true;
          break;
      }
      if (drawlLine) {
        c.lineTo(co*sx*xFlip+x, ins[i++]*s+y);
      }
    };
  }
}   

// Mob classes

var mobDestroyed = false;
class Mob {
  constructor(app, lists) {
    this.app = a[app];
    this.dx = this.dy = this.ax = this.ay = 0;
    this.turnScale = 0;
    mobs.push(this);
    lists.forEach(l => l.push(this));
    this.lists = lists;
    this.ch = [];
  }
  // update
  u(d) {
    this.dx += this.ax * d;
    this.dy += this.ay * d;
    this.x += this.dx * d;
    this.y += this.dy * d;
  }

  destroy() {
    this.app = false;
    this.dead = true;
    mobDestroyed = true;
    //this.lists.forEach(l => l.splice(l.indexOf(this), 1));
    this.ch.forEach(c => c.destroy());
  }

  collide(m) {
    this.destroy();
    m.destroy();
    for (var i = 0; i < 10; i++) {
      var e = new Explosion(50);
      e.x = this.x - (this.size / 2) + rand.range(0, this.size);
      e.y = this.y - (this.size / 2) + rand.range(0, this.size);
      sfx.push(e);
    }
  }
}

// RAF
var time = 0;
function raf(fn) {
  function rf(fn) {
    return window.requestAnimationFrame(function() {
      var now = Date.now();
      var elapsed = now - time;
      if (elapsed > 999) {
        elapsed = 1 / 60;
      } else {
        elapsed /= 1000;
      }
      time = now;
      fn(elapsed);
    });
  }
  return rf(function tick(elapsed) {
    fn(elapsed);
    rf(tick);
  });
}


// "Physics" (LOL)

function dist(a,b) {
  return Math.abs(a.x-b.x) + Math.abs(a.y-b.y);
}
function collide(a, b) {
  if (dist(a,b) < a.size + b.size) {
    a.collide(b);
  }
}

// Game Loop
var layers = [[],[],[]];
var mobs = [];
var sfx = [];
var enemies = [];
var players = [];
var canvas = document.querySelector('canvas');
var ctx = canvas.getContext('2d');
function renderMob(m, flip) {
  if (m.specialRender) {
    m.specialRender(ctx);
  }
  var turnScale = 1;
  if ((m.turnScale > 0 && flip) || (m.turnScale < 0 && !flip)) {
    turnScale = 1 - Math.abs(m.turnScale);
  } 
  Renderer.render(ctx,m.app,m.x,m.y,m.scale,m.blink?0:undefined,flip,turnScale);
}
var timers = [];
raf(function(d) {
  if (timers.length) {
    timers.forEach(t => {
      t[1] -= d;
      if (t[1] < 0) {
        t[0]();
        t.d = true;
      }
    })
    timers = timers.filter(f => !f.d);
  }
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  layers.forEach(l => l.forEach(m => {
    m.k && m.k(); // TODO this is only for the ship, put it somewhere
    m.u(d);
    renderMob(m);
    renderMob(m, true); // TODO: Only if m.flipped
    /*if (true) {// Debug 
      ctx.strokeStyle = '#00ff00';
      ctx.beginPath();
      ctx.arc(m.x,m.y,m.size,0,Math.PI*2,true);
      ctx.stroke();
    }*/
    const targets = m.hits == 'p' ? players : enemies;
    //m.hits && (m.hits === 'p' ? !player.dead && collide(player, m) : enemies.forEach(e => collide(e, m)));
    m.hits && targets.forEach(e => collide(e, m));
    if (
      (m.kob && m.y > H + m.size) ||
      (m.kot && m.y < -m.size) ||
      (m.kor && m.x > W + m.size) ||
      (m.kol && m.x < -m.size)) {
      m.destroy();
    }
  }))

  if (mobDestroyed){
    mobs.filter(m => m.dead == true).forEach(m => {
      m.lists.forEach(l => l.splice(l.indexOf(m), 1));
    });
    //console.log(mobs.filter(m => m.dead == true).length+" dead mobs")
    mobDestroyed = false;
    mobs = mobs.filter(m => m.dead === undefined);
    //console.log(mobs.length+" alive mobs")
  }

  sfx.forEach(s => {
    s.update(d);
    s.render(ctx);
  });
  renderUI(ctx);
});

const lcdmap = [
  [1,1,1,0,1,1,1],
  [0,0,1,0,0,1,0],
  [1,0,1,1,1,0,1],
  [1,0,1,1,0,1,1],
  [0,1,1,1,0,1,0],
  [1,1,0,1,0,1,1],
  [1,1,0,1,1,1,1],
  [1,0,1,0,0,1,0],
  [1,1,1,1,1,1,1],
  [1,1,1,1,0,1,1],
]

var NS = 3;
// Score renderer
function renderScore(c, x, y, score) {
  score.forEach((d, i) => renderDigit(c, x + i * (NS * 12), y, d));
}

function renderDigit(c, x, y, digit) {
  const x6 = 6 * NS + NS;
  const x3 = 3 * NS + NS;
  const f = Renderer.render.bind(Renderer);
  const l = lcdmap[digit];
  f(c, l[0]?a.n3:a.n2, x, y - x6, NS);
  f(c, l[1]?a.n1:a.n0, x - x3, y - x3, NS);
  f(c, l[2]?a.n1:a.n0, x + x3, y - x3, NS);
  f(c, l[3]?a.n3:a.n2, x, y, NS);
  f(c, l[4]?a.n1:a.n0, x - x3, y + x3, NS);
  f(c, l[5]?a.n1:a.n0, x + x3, y + x3, NS);
  f(c, l[6]?a.n3:a.n2, x, y + x6, NS); 
}

// THE GAME!
const W = canvas.width;
const H = canvas.height;

function renderUI(c) {
  if (gState == 0) {
    c.font = "20px Arial";
    c.fillStyle= "#00ff00";
    c.fillText("Loading Music...",10,50);
  } else if (gState == 1) {
    c.font = "20px Arial";
    c.textAlign="center"; 
    c.fillStyle= "#00ff00";
    c.fillText("ArcherFire",W/2,100);
    c.font = "40px Arial";
    c.fillText("Duet of Aces",W/2,135);
    c.font = "18px Arial";
    c.fillText("INSTRUCTIONS",W/2,300);
    c.fillStyle= "#ffffff";
    c.fillText("Player 1 - WASD + Space",W/2,330);
    c.fillText("Player 2 - Numpad + 0",W/2,360);
    c.font = "30px Arial";
    c.fillStyle= "#00ff00";
    c.fillText("Press Enter to start",W/2,500);
    c.fillStyle= "#ffffff";
    c.font = "18px Arial";
    c.fillText("Programmed by Santiago Zapata for #js13k 2018",W/2,550);
    c.fillText("Theme music by Ryan Malm / @ryanmalm", W/2,580);
  } else if (gState == 2 || gState == 3) {
    Renderer.render(c,a.scoreBack,250,600,NS*2.5,undefined,true);
    renderScore(c, 50, 550, p1.scoreArray)
    Renderer.render(c,a.scoreBack,530,600,NS*2.5);
    renderScore(c, 600, 550, p2.scoreArray)
    renderScore(c, 380, 50, waveArray)
  } 
  if (gState == 3) {
    c.font = "30px Arial";
    c.fillStyle= "#00ff00";
    c.fillText("GAME OVER",W/2,300);
    c.fillText("Press Enter to restart",W/2,500);
  }
}

var ef = { // Enemy Factory
  i(){
    this.defs={
      d: {ap:'mine',hp:10,sp:300,sc:10,scale:5,size:15}, // Crasher coming down in formation
      c: {ap:'enemyFighter',hp:1,sp:100,sc:50,fp:true,size:15,scale:4}, // Cruises the screen shooting at player
      p: {ap:'platform',hp:1,sp:20,sc:0,size:80,scale:25,t:[[2,-1],[2,1]],transparent:true}, // Turret platform
      t: {ap:'e1',hp:5,sp:0,sc:20,fp:true,size:15}, // Turret
    }
  },
  b(id,x,y,dx,dy,lv=1){
    var d = this.defs[id];
    const groups = [layers[d.t?1:2]];
    if (!d.transparent) {
      groups.push(enemies);
    }
    var hp = d.hp + d.hp * (lv / 2);
    var e = new Enemy(hp,d.ap,groups);
    e.x = x;
    e.y = y;
    e.dy = dy;
    e.dx = dx;
    e.score = d.sc;
    e.reactionTime = d.rt || 10000;
    e.reactionTime -= lv * 2000;
    if (e.reactionTime < 1000) {
      e.reactionTime = 1000;
    }
    e.fireAtPlayer = d.fp;
    e.size = d.size;
    if (!d.transparent) {
      e.hits = 'p'; // Player
    }
    var s = e.scale = d.scale || 1;
    if (d.t) { // Mounted turrets
      d.t.forEach(t => {
        e.ch.push(this.b('t',x+t[0]*s,y+t[1]*s,dx,dy));
        e.ch.push(this.b('t',x+t[0]*-s,y+t[1]*s,dx,dy));
      });
    }
    e.react();

    this.kob = dy > 0;
    this.kot = dy < 0;
    this.kol = dx < 0;
    this.kor = dx > 0;
    return e;
  },
  horizontal(id,l,y,lv) {
    var d = this.defs[id];
    var x = l?(W+d.size):-d.size;
    var e = this.b(id,x,y,d.sp*(l?-1:1),0,lv);
    e.kor = !l;
    e.kol = l;
  },
  vertical(id,top,x,lv) {
    var d = this.defs[id];
    this.b(id,x,top?-100:H+100,0,top?d.sp:-d.sp,lv)
  },
  f(id,n,x,w,lv) { // Horizontal Formation
    var d = this.defs[id];
    var ix=x-w/2;
    var is=w/(n-1);
    for (var i = 0; i < n; i++) {
      this.b(id,ix+i*is,-100,0,d.sp,lv)
    }
  },
  hrow(id,left,y,n,lv) {
    var d = this.defs[id];
    var is = d.size + 20;
    var ix= -n*is - 100;
    if (left) {
      ix = W + 100;
    }
    for (var i = 0; i < n; i++) {
      this.b(id,ix+i*is,y,d.sp*(left?-1:1),0,lv)
    }
  },
  vrow(id,top,x,n,lv) {
    var d = this.defs[id];
    var is = -(d.size + 20);
    var iy= n*is - 100;
    if (!top) {
      iy = H + 100;
      is *= -1;
    }
    for (var i = 0; i < n; i++) {
      this.b(id,x,iy+i*is,0,d.sp*(top?1:-1),lv)
    }
  }
}
ef.i();

var shipScale = 2;

class Ship extends Mob {
  u(d) {
    super.u(d);
    if (this.scale > shipScale) {
      this.scale -= (d * 24);
      return;
    }
    this.scale = shipScale;
    // Damp
    var D = 100 * d;
    if (this.dx !== 0) {
      this.dx += (-Math.sign(this.dx) * D);
    }
    if (this.dy !== 0) {
      this.dy += (-Math.sign(this.dy) * D);
    }
    // Inertia
    if (Math.abs(this.turnScale) < 0.01) {
      this.turnScale = 0;
    } else if (this.turnScale < 0) {
      this.turnScale += 0.01;
    } else if (this.turnScale > 0) {
      this.turnScale -= 0.01;
    }
    // BOundaries
    if (this.x < 0) this.x = 0;
    if (this.x > W) this.x = W;
    if (this.y < 0) this.y = 0;
    if (this.y > H) this.y = H;
  }
  k(){
    if (this.scale > shipScale) {
      return;
    }
    var P = 300;
    this.ay = 0;
    this.ax = 0;
    if (isDown(this.keys[0])){ // Rise
      this.ay = -P;
    } else if (isDown(this.keys[1])){ // Sink
      this.ay = P;
    } 
    if (isDown(this.keys[2])){
      this.flipped = true;
      this.ax = -P;
      this.turnScale -= 0.02;
      if (this.turnScale < -0.5) {
        this.turnScale = -0.5;
      }
    } else if (isDown(this.keys[3])){
      this.flipped = true;
      this.ax = P;
      this.turnScale += 0.02;
      if (this.turnScale > 0.5) {
        this.turnScale = 0.5;
      }
    }
    if (isDown(this.keys[4])) {
      this.fire();
    }
  }
  fire() {
    if (this.fireBlocked) {
      return;
    }
    this.fireBlocked = true;
    setTimeout(() => this.fireBlocked = false, 100);
    var b = new Mob('missile', [layers[1]]);
    b.x = this.x;
    b.y = this.y;
    b.dy = -rand.range(550, 600);
    b.size = 5;
    b.hits = 'e'; // Enemy
    b.kot = true;
    b.scale = 4;
    b.player = this;
    playSound(2);
  }
  destroyed(m) {
    playSound(3);
    this.score += m.score;
    this.updateScoreArray();
  }
  updateScoreArray() {
    this.scoreArray = [];
    var ss = '0000000'+this.score;
    ss = ss.substr(ss.length - 5)
    for (var i = 0, len = ss.length; i < len; i += 1) {
      this.scoreArray.push(+ss.charAt(i));
    }
  }
  destroy() {
    if (this.energy > 0) {
      this.energy--;
      playSound(0);
      return;
    }
    playSound(3);
    super.destroy();
    this.dead = true;
    if (!players.filter(p=>!p.dead).length) {
      gameOver();
    }
  }
}

class Enemy extends Mob {
  constructor(hp, app, lists, reactionTime) {
    super(app, lists);
    this.hp = hp;
    this.reactionTime = reactionTime;
  }

  nearestPlayer() {
    return players.length && players.sort((a,b)=>dist(a,this)-dist(b,this))[0];
  }

  react() {
    if (this.dead)
      return;
    if (this.fireAtPlayer) {
      this.fire();
    }
    timers.push([()=>this.react(), this.reactionTime/1000]);
  }

  fire() {
    var p = this.nearestPlayer();
    if (!p) {
      return;
    }
    playSound(1);
    var b = new Mob('bullet', [layers[1]]);
    b.x = this.x;
    b.y = this.y;
    var angle = Math.atan2((p.y - this.y), (p.x - this.x));
    var speed = rand.range(250, 300);
    b.dx = Math.cos(angle) * speed;
    b.dy = Math.sin(angle) * speed;
    b.size = 5;
    b.hits = 'p';
    b.kob = true;
    b.kot = true; // TODO: Kill anywhere outside screen
    b.scale = 1;
  }

  collide(m) {
    this.hp--;
    this.blink = true;
    setTimeout(() => this.blink = false, 50);
    if (this.hp <= 0) {
      m.player.destroyed(this);
      super.collide(m);
    }
    playSound(0);
    var e = new Explosion(20);
    e.x = m.x;
    e.y = m.y;
    sfx.push(e);
    m.destroy();
  }
}

class Star extends Mob {
  destroy(m) {
    super.destroy();
    // Create a new Star
    var size = rand.range(1, 3);
    var t = new Star('star'+size, [layers[0]]);
    t.x = rand.range(0, W);
    t.y = -size;
    t.dy = rand.range(50, 100);
    t.size = size;
    t.kob = true;
    t.scale = 1;
  }
}

class Planet extends Mob {
  specialRender(c) {
    c.globalAlpha = 1;
    var grad=c.createLinearGradient(this.x-this.gax,this.y-this.gay,this.x+this.gax,this.y+this.gay);
    grad.addColorStop(0, this.color1);
    grad.addColorStop(1, this.color2);
    c.fillStyle=grad;
    c.beginPath();
    c.arc(this.x,this.y,this.size,0,Math.PI*2,true);
    c.fill();
  }
}

class Explosion {
  constructor(s){
    this.sf = s;
    this.s0 = s / 5;
    this.runTime = 0;
  }
  update(d){
    this.runTime += d;
  }
  render(c){
    var totalTime = 0.2;
    var progress = this.runTime / totalTime;
    if (progress > 1) {
      sfx.splice(sfx.indexOf(this),1);
      return;
    }
    var cut = 0.4;
    if (progress < cut) {
      // Growing ball of fire
      var segmentProgress = progress / cut;
      var size = this.s0 + segmentProgress * (this.sf-this.s0);
      c.fillStyle = '#eecc00';
      c.beginPath();
      c.arc(this.x,this.y,size,0,Math.PI*2,true);
      c.fill();
    } else {
      // Fading fire
      var segmentProgress = (progress - cut) / (1 - cut);
      var size = segmentProgress * this.sf;
      c.fillStyle = '#bb9900';
      c.beginPath();
      c.arc(this.x,this.y,this.sf,0,Math.PI*2,true);
      c.arc(this.x,this.y,size,0,Math.PI*2,false);
      c.fill();
    }
  }
}

const WH = '#ffffff';
const RD = '#ff0000';


const a = { // Appearances
  /*ship Half ovals
    'o','#dddddd','vh',0,-6,2.2,2.2,Math.PI/2,Math.PI+Math.PI/2,'f',
    'o','#000000','vh',0,-6,2,1.5,Math.PI/2,Math.PI+Math.PI/2,'f',
  ]
  */
  ship: [
    '#eeeeee','p',-2,2,-4,4,-6,0,-4,-1,-2,-4,0,-4,0,2,'f',
    'o','#0000ff','p',-3,3,-4,4,-6,4,-8,0,-6,-3,-4,-4,-5,-1,'f',
    'o','#dddddd','v',0,-6,2.2,2.2,'f',
    'o','#888888','vh',0,1,2.5,2,Math.PI,2*Math.PI,'f',
    'o','#ff3333','p',0,1,-2.5,1,-2.5,2,-1.5,3,0,3,'f',
    'o','#000000','v',0,-6,2,1.5,'f',
    'o','#ff0000','vh',0,-6,2,1.5,0.5,Math.PI-0.5,'f',
  ],
  ship2: [ // Same as ship1, just different wing color
    '#eeeeee','p',-2,2,-4,4,-6,0,-4,-1,-2,-4,0,-4,0,2,'f',
    'o','#ff0000','p',-3,3,-4,4,-6,4,-8,0,-6,-3,-4,-4,-5,-1,'f', // here
    'o','#dddddd','v',0,-6,2.2,2.2,'f',
    'o','#888888','vh',0,1,2.5,2,Math.PI,2*Math.PI,'f',
    'o','#ff3333','p',0,1,-2.5,1,-2.5,2,-1.5,3,0,3,'f',
    'o','#000000','v',0,-6,2,1.5,'f',
    'o','#ff0000','vh',0,-6,2,1.5,0.5,Math.PI-0.5,'f',
  ],
  enemyFighter: [
    '#33aa33','p',3,0,4,0,4,-6,2,-8,2,-6,3,-5,'f',
    'o','#33ff33','p',2,0,2,-4,4,0,4,2,'f',
    'o','#888888','v',0,0,1,3,'f',
    'o','#000033','v',0,0,1,2,'f',
  ],
  missile: [
    '#ff3333','p',0,1,1.5,3.5,0,3.5,'f',
    'o','#eecc00','p',0,4,0.7,4,0.85,4.5,0,5,'f',
    'o','#dddddd', 'p', 0,0,0.5,1,0.5,4,0,4,'f',
  ],
  star1: [WH,'c',1],
  star2: [WH,'c',2],
  star3: [WH,'c',3],
  planet: ['G1','c',10],
  bullet: [RD,'c',4],
  mine: ['#888888','p',0,-3, 1,-2, 3,-3, 2,-1, 3,0, 2,1, 3,3, 1,2, 0,3, 'f','o','#dd0000','c',1],
  e1: ['#888888','c',15,'o','#dd0000','c',5],
  platform: [
    '#888888','p',0,2,3,2,3,3,1,4,0,4,'f',
    'o','#888888','p',0,0,1,0,1,-2,0,-2,'f',
    'o','#bbbbbb','p',0,-3, 2,-3, 3,-2, 3,-1.5, 4,-1.5, 4,-1.3, 3,-1.3, 3,1.3, 4,1.4, 4,1.6, 3,1.6, 3,2, 2,2.5, 2,4, 1.8,4, 1.8,2.5, 1,3, 0,3,
    0,1,1,1,1,-1,0,-1,'f',
    'o','#0000dd','v',0.5,-2.5,1,0.2,'f',
    'o','#0000dd','v',2.5,-1.8,1,0.2,'f',
    'o','#0000dd','v',2.5,0.8,1,0.2,'f',
    'o','#0000dd','v',0.5,2.2,1,0.2,'f',
  ],
  n0: ['#003300','p',-1,-2,0,-3,1,-2,1,2,0,3,-1,2,'f'], 
  n1: ['#00ff00','p',-1,-2,0,-3,1,-2,1,2,0,3,-1,2,'f'], // TODO: Optimize, same as n0, different color
  n2: ['#003300','p',-2,-1,-3,0,-2,1,2,1,3,0,2,-1,'f'],
  n3: ['#00ff00','p',-2,-1,-3,0,-2,1,2,1,3,0,2,-1,'f'], // TODO: Optimize, same as n2, different color
  scoreBack: ['#002200','a',0.7,'p',0,0,4,-12,40,-12,40,0,'f']
}

var p1,p2;
function startGame() {
  themeAudio.play();
  function createShip(a,x,k){
    var p = new Ship(a, [players, layers[2]]);
    p.energy = 2;
    p.x = x;
    p.y = H + 120;
    p.dy = -200;
    p.size = 20;
    p.score = 0;
    p.updateScoreArray();
    p.scale = 10;
    p.keys=k;
    return p;
  }

  p1 = createShip('ship', W / 2 - 100, [87,83,65,68,32]);
  p2 = createShip('ship2', W / 2 + 100, [56,53,52,54,48]);
  //p1.keys=[38,37,39,32]; //Arrow keys
  timers.push([()=>newWave(), 5]);
}

// Enemy Waves
var wave = 1;
var waveArray = [];
function updateWaveArray() {
  waveArray = [];
  var ss = '0000000'+(Math.floor(wave / 10)+1);
  ss = ss.substr(ss.length - 2)
  for (var i = 0, len = ss.length; i < len; i += 1) {
    waveArray.push(+ss.charAt(i));
  }
}

updateWaveArray();

function getRandomColor() {
  var letters = '0123456789ABCDEF';
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(seeded() * 16)];
  }
  return color;
}

function addEnemy(){
  var type = rands.range(0, 10);
  var diff = Math.floor(wave/10)+1;
  //diff = wave + 1; // Test
  switch (type) {
    case 0: // Formation
      ef.vrow('d',rands.b(),rands.range(100,W-100),diff*2,diff);
      break;
    case 1: // Cruiser
      ef.hrow('d',rands.b(),rands.range(100,H-100),diff*2,diff);
      break;
    case 2:
      ef.vertical('c',rands.b(),rands.range(100,W-100),diff);
      break;
    case 3:
    case 4:
    case 5:
      ef.horizontal('c',rands.b(),rands.range(100,H-100),diff)
      break;
    case 6: // Formation
    case 7: // 
    case 8: // 
    case 9: // 
      ef.f('d',rands.range(2,diff+2),W/2,rands.range(400,600),diff);
      break;
  }
}

function newWave(){
  // Check at least one player alive
  if (!players.filter(p=>!p.dead).length) {
    return;
  }
  addEnemy();
  addEnemy();
  if (rands.range(0,100) < 20) {
    ef.vertical('p',rands.b(),rands.range(100,W-100),Math.floor(wave/10)+1);
  }
  if (wave % 20 === 1) {
    var t = new Planet('planet', [layers[0]]);
    t.x = rands.range(100, W - 100);
    t.y = -100;
    t.dy = 10;
    t.size = rands.range(2,10);
    var angle = seeded() * (2 * Math.PI);
    t.gax = Math.cos(angle) * t.size;
    t.gay = Math.sin(angle) * t.size;
    console.log(angle, t.size, t.gax, t.gay)
    t.color1 = getRandomColor();
    t.color2 = getRandomColor();
    t.kob = true;
    t.scale = 1;
  }
  wave++;
  updateWaveArray();
  timers.push([()=>newWave(), 3]);
}

var startingGame = false;
typed(13, () => {
  if (gState == 1) {
    if (startingGame) {
      return;
    }
    startingGame = true;
    playSound(4);
    setTimeout(() => {
      startGame();
      startingGame = false;
      gState = 2;
    }, 1500);
  } else if (gState == 3) {
    restart();
    gState = 2;
  }
});

function stars50(){
  for (var i = 0; i < 50; i++) {
    var size = rand.range(1, 3);
    var t = new Star('star'+size, [layers[0]]);
    t.x = rand.range(0, W);
    t.y = rand.range(0, H);
    t.dy = rand.range(50, 100);
    t.size = size;
    t.kob = true;
    t.scale = 1;
  }
}

function title(){
  stars50();
  gState = 1;
}

function gameOver() {
  themeAudio.pause();
  themeAudio.currentTime = 0
  gState = 3;
}

function restart() {
  seeded = LCG(13312);
  layers = [[],[],[]];
  mobs = [];
  enemies = [];
  players = [];
  timers = [];
  wave = 1;
  waveArray = [];
  updateWaveArray();
  stars50();
  startGame();
}