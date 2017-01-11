#include <vector>
#include "profiler.h"
#include "utils.h"

using namespace std;


// Start Profiler
void ProfilerStruct::Start()
{
	QueryPerformanceCounter(&CountStart);
}

// Stop Profiler
void ProfilerStruct::Stop()
{
	QueryPerformanceCounter(&CountStop);
}

// Acquire Profiler Frequency
void ProfilerStruct::AcquireFrequency()
{
	QueryPerformanceFrequency(&Frequency);
}

// Print Profiler Log
void ProfilerStruct::Log()
{
	AcquireFrequency();
	LogInfo("Performance Counter Time %f ms.\n", 1000.0f*(float)(CountStop.QuadPart - CountStart.QuadPart) / (float)Frequency.QuadPart);
}