/**
 * Seconds of video behind the scroll experience. Scroll maps linearly onto this,
 * so anything that drives the scroll (the autoplay run, the engine audio) has
 * to use the same number — if they drift, the audio desyncs from the frames.
 */
export const VIDEO_DURATION = 50.17

/**
 * How much faster than real time the guided run plays back.
 *
 * 1 = exactly 1x, which is what "plays the video at 1x" means and what the
 * engine note is mixed for. Above 1 the audio is still mapped to progress, so
 * it scrubs forward at the same rate — recognisable up to about 1.6x, a mess
 * beyond it. 1.5 turns the 50s run into ~33s.
 *
 * Raise it to shorten the run, lower it toward 1 for a slower, more filmic
 * pass. Bump the ceiling above ~1.6 only if you also stop the audio during
 * the run.
 */
export const PLAYBACK_RATE = 1.5

/**
 * Frames that must be decoded before the loader lifts. The reveal fires here,
 * so anything reporting *readiness* must divide by this — dividing by the full
 * frame count makes the odometer read 002% at the moment it announces ready.
 *
 * The shutter slats deliberately still use the full count: for those, "how much
 * of the whole video is here" is the honest question.
 */
export const START_FRAMES = 24
