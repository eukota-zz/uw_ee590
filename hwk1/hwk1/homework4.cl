
#define SECTION_SIZE  8
__kernel void reduce_v1(__global float* g_indata, __global float* g_outdata)
{
	__local float sdata[SECTION_SIZE];
	int gid = get_global_id(0);
	int lid = get_local_id(0);
	// each thread loads one element from global to local mem
	sdata[lid] = g_indata[gid];

	sub_group_barrier(CLK_LOCAL_MEM_FENCE); 

	//reduce in shared local mem
	for(uint s=1; s< SECTION_SIZE; s*=2)
	{ 
		if(lid % (2*s) == 0)
			sdata[lid] += sdata[lid+s];
		sub_group_barrier(CLK_LOCAL_MEM_FENCE); 
	}

	//write result for section to global mem
	if(lid ==0)
		g_outdata[get_group_id(0)]= sdata[0];
}


__kernel void reduce_v2(__global float* g_indata, __global float* g_outdata)
{
	__local float sdata[SECTION_SIZE];
	int gid = get_global_id(0);
	int lid = get_local_id(0);
	// each thread loads one element from global to local mem
	sdata[lid] = g_indata[gid];

	sub_group_barrier(CLK_LOCAL_MEM_FENCE); 

	//reduce in shared local mem
	for(uint s=1; s< SECTION_SIZE; s*=2)
	{ 
		int index = 2*s*lid;
		if(index < SECTION_SIZE)
			sdata[index] += sdata[index+s];
		sub_group_barrier(CLK_LOCAL_MEM_FENCE); 
	}

	//write result for section to global mem
	if(lid ==0)
		g_outdata[get_group_id(0)]= sdata[0];
}


__kernel void reduce_v3(__global float* g_indata, __global float* g_outdata)
{
	__local float sdata[SECTION_SIZE];
	int gid = get_global_id(0);
	int lid = get_local_id(0);
	// each thread loads one element from global to local mem
	sdata[lid] = g_indata[gid];

	sub_group_barrier(CLK_LOCAL_MEM_FENCE); 

	//reduce in shared local mem
	for(uint s = get_local_size(0); s>=1; s/=2)
	{ 
		if(lid <s)
			sdata[lid] += sdata[lid+s];
		sub_group_barrier(CLK_LOCAL_MEM_FENCE); 
	}

	//write result for section to global mem
	if(lid ==0)
		g_outdata[get_group_id(0)]= sdata[0];
}


///////////// SCAN ///////////////////
__kernel void inclusive_sum_scan_v1(__global float* X, __global float* Y, int InputSize)
{ 
	__local float XY[SECTION_SIZE];
	int gid = get_global_id(0);
	int lid = get_local_id(0);
	
	if(gid < InputSize)
		XY[lid] = X[gid];

	for(uint stride=1; stride <= lid; stride *=2)
	{ 
		sub_group_barrier(CLK_LOCAL_MEM_FENCE);
		XY[lid] += XY[lid - stride];
	}

	Y[gid] = XY[lid];
}

__kernel void inclusive_sum_scan_v2(__global float* X, __global float* Y, int InputSize)
{ 
	__local float XY[SECTION_SIZE];
	int gid = get_global_id(0);
	int lid = get_local_id(0);
	int lsz = get_local_size(0);
	if(gid < InputSize)
		XY[lid] = X[gid];

	// Phase 1 : reduction tree - non-thread-divergent
	for (uint stride = 1; stride < lsz; stride *= 2)
	{
		sub_group_barrier(CLK_LOCAL_MEM_FENCE);
		int index = (lid+1)*2*stride -1;
		if (index < lsz) 
			XY[index] += XY[index - stride]; 
	}

	// Phase 2 : reverse distribution tree
	for (int stride = SECTION_SIZE/4; stride > 0; stride /= 2)
	{
		sub_group_barrier(CLK_LOCAL_MEM_FENCE);
		int index = (lid+1)*stride*2-1;
		if(index + stride < lsz) 
			XY[index + stride] += XY[index]; 
	}
	
	sub_group_barrier(CLK_LOCAL_MEM_FENCE);
	Y[gid] = XY[lid]; 
}


