// an async sleep function
function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// 5 second throttle on jobs
const throttle = 5000

// setPreference jobs need to be run synchronously
const jobs = []

async function processJobs () {
  try {
    // update preferences cache with each job's data
    for (const job of jobs) {
      // get preferences
      const preferences = await job.wxm.listPreferences()
      // add user to to the globalSyndicated list
      for (const viewName of job.views) {
        const view = preferences.views.find(v => v.viewName === viewName)
        const users = view.globalSyndicated.users
        if (users.includes(job.username)) {
          // already in list
          // console.log(job.username, 'was already in the', viewName, 'view')
        } else {
          // add to list
          // console.log('adding', job.username, 'to the', viewName, 'view')
          users.push(job.username)
        }
      }
      // update globalSyndicated list on WXM
      await job.wxm.setPreferences(preferences)
    }
    // remove finished jobs from the jobs list
    jobs.splice(0, jobs.length)
    // done
  } catch (e) {
    console.log('failed to get or save WXM preferences:', e.message)
  }
}

// run jobs constantly, with a throttle
async function jobManager () {
  while (true) {
    try {
      // process jobs list
      await processJobs()
    
      // wait before loop
      await sleep(throttle)
    } catch (e) {
      console.log('job runner failed:', e.message)
    }
  }
}

// start job manager
jobManager()

module.exports = jobs