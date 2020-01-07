This directory contains a Jenkinsfile which can be used to build
nodejs-ex using an OpenShift build pipeline.

To do this, run:

```bash
# create silly as usual
oc new-app https://github.com/jeremy-003/silly

# now create the pipeline build controller from the openshift/pipeline
# subdirectory
oc new-app https://github.com/jeremy-003/silly \
  --context-dir=openshift/pipeline --name silly
```
