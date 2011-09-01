define [], ->
  pointwise_combine = (ks,vs) ->
    c = {}
    c[v] = vs[k] for own k, v of ks
    c
  getdeps = (f, deplist, depfunc) ->
    locvars = (locvar for own locvar, locpath of deplist)
    locpaths = (locpath for own locvar, locpath of deplist)
    locfunc = (vars...) ->
      context = pointwise_combine locvars, vars
      depfunc.apply(context, [])
    f locpaths, locfunc

  getdeps